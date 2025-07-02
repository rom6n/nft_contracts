import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type FixedSaleConfig = {
    
};

export function fixedSaleConfigToCell(config: FixedSaleConfig): Cell {
    return beginCell().endCell();
}

export class FixedSale implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

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
}
