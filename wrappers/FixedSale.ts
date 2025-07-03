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
        to: Address,
        amount: bigint,
        query_id?: bigint,
    ) {
        const emergency_msg_body = beginCell()
            .storeUint(0x10, 6)
            .storeAddress(to)
            .storeCoins(amount)
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .endCell();

        const emergency_msg_cell = beginCell().storeUint(0, 8).storeRef(emergency_msg_body).endCell();

        const body = beginCell()
            .storeUint(555, 32)
            .storeUint(query_id ?? 0, 64)
            .storeRef(emergency_msg_cell)
            .endCell();

        await provider.internal(via, {
            value: BigInt(0),
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

    async sendChangeSaleData(provider: ContractProvider, via: Sender, value: bigint, query_id?: bigint) {
        const bodyBuilder = beginCell()
            .storeUint(0x6c6c2080, 32)
            .storeUint(query_id ?? 0, 64)
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder,
        });
    }
}
