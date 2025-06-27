import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    Slice,
} from '@ton/core';

export type MarketplaceContractConfig = {
    seqno: number;
    subwallet_id: number;
    public_key: Buffer<ArrayBufferLike>;
};

export function marketplaceContractConfigToCell(config: MarketplaceContractConfig): Cell {
    return beginCell()
        .storeUint(config.seqno, 32)
        .storeUint(config.subwallet_id, 32)
        .storeBuffer(config.public_key)
        .endCell();
}

export class MarketplaceContract implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new MarketplaceContract(address);
    }

    static createFromConfig(config: MarketplaceContractConfig, code: Cell, workchain = 0) {
        const data = marketplaceContractConfigToCell(config);
        const init = { code, data };
        return new MarketplaceContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeployContract(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        signature: Buffer,
        state_init: Cell,
        forwardBody: Cell,
    ) {
        let bodyBuilder = beginCell()
            .storeUint(1, 32)
            .storeBuffer(signature)
            .storeRef(state_init)
            .storeRef(forwardBody)
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder,
        });
    }
}
