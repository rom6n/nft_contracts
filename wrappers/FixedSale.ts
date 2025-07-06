import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type FixedSaleConfig = {
    is_completed: number;
    created_at: number;
    marketplace_address: Address;
    nft_address: Address;
    nft_owner_address?: Address;
    full_price: bigint;
    marketplace_fee_address: Address;
    marketplace_fee: bigint;
    royalty_address: Address;
    royalty_amount: bigint;
    sold_at: number;
    query_id: bigint;
};

export function fixedSaleConfigToCell(config: FixedSaleConfig): Cell {
    const fees_cell = beginCell()
        .storeAddress(config.marketplace_fee_address)
        .storeCoins(config.marketplace_fee)
        .storeAddress(config.royalty_address)
        .storeCoins(config.royalty_amount)
        .endCell();

    let cell_builder = beginCell()
        .storeUint(config.is_completed, 1)
        .storeUint(config.created_at, 32)
        .storeAddress(config.marketplace_address)
        .storeAddress(config.nft_address);

    if (config.nft_owner_address) {
        cell_builder = cell_builder.storeAddress(config.nft_owner_address);
    } else {
        cell_builder = cell_builder.storeUint(0, 2);
    }

    cell_builder = cell_builder
        .storeCoins(config.full_price)
        .storeRef(fees_cell)
        .storeUint(config.sold_at, 32)
        .storeUint(config.query_id, 64);

    return cell_builder.endCell();
}

export class FixedSale implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new FixedSale(address);
    }

    static createFromConfig(config: FixedSaleConfig, code: Cell, workchain = 0) {
        const data = fixedSaleConfigToCell(config);
        const init = { code, data };
        return new FixedSale(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendEmergencyMessage(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        to: Address,
        amount_to: bigint,
        mode: number,
        query_id?: bigint,
    ) {
        const emergency_msg_body = beginCell()
            .storeUint(0x10, 6)
            .storeAddress(to)
            .storeCoins(amount_to)
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .endCell();

        const emergency_msg_cell = beginCell().storeUint(mode, 8).storeRef(emergency_msg_body).endCell();

        const body = beginCell()
            .storeUint(555, 32)
            .storeUint(query_id ?? 0, 64)
            .storeRef(emergency_msg_cell)
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async sendDeposit(provider: ContractProvider, via: Sender, amount: bigint, query_id?: bigint) {
        await provider.internal(via, {
            value: amount,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32)
                .storeUint(query_id ?? 0, 64)
                .endCell(),
        });
    }

    async sendChangeSaleData(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        new_full_price: bigint,
        new_marketplace_fee: bigint,
        new_royalty_amount: bigint,
        query_id?: bigint,
    ) {
        const bodyBuilder = beginCell()
            .storeUint(0x6c6c2080, 32)
            .storeUint(query_id ?? 0, 64)
            .storeCoins(new_full_price)
            .storeCoins(new_marketplace_fee)
            .storeCoins(new_royalty_amount)
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder,
        });
    }

    async sendCancelSale(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(3, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendBuy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendNft(provider: ContractProvider, via: Sender, value: bigint, prev_owner: Address, opcode: number) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opcode, 32)
                .storeUint(0, 64)
                .storeBuilder(beginCell().storeAddress(prev_owner).storeStringTail('hello'))
                .endCell(),
        });
    }

    async getFixPriceData(provider: ContractProvider) {
        const { stack } = await provider.get('get_fix_price_data', []);
        return {
            is_completed: stack.readBoolean(),
            created_at: stack.readNumber(),
            marketplace_address: stack.readAddress(),
            nft_address: stack.readAddress(),
            nft_owner_address: stack.readAddress(),
            full_price: stack.readNumber(),
            marketplace_fee_address: stack.readAddress(),
            marketplace_fee: stack.readNumber(),
            royalty_address: stack.readAddress(),
            royalty_amount: stack.readNumber(),
            sold_at: stack.readNumber(),
            query_id: stack.readNumber(),
            balance: stack.readNumber(),
        };
    }

    async getSaleData(provider: ContractProvider) {
        const { stack } = await provider.get('get_sale_data', []);
        return {
            ID: stack.readNumber(),
            is_completed: stack.readBoolean(),
            created_at: stack.readNumber(),
            marketplace_address: stack.readAddress(),
            nft_address: stack.readAddress(),
            nft_owner_address: stack.readAddress(),
            full_price: stack.readNumber(),
            marketplace_fee_address: stack.readAddress(),
            marketplace_fee: stack.readNumber(),
            royalty_address: stack.readAddress(),
            royalty_amount: stack.readNumber(),
        };
    }
}
