import {
    address,
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
} from '@ton/core';
import { todo } from 'node:test';

export type NftItemConfig = {
    index: number;
    collection_address: Address;
    owner_address: Address;
    content: Cell;
};

export type NftItemConfigLite = {
    index: number;
    collection_address: Address;
};

export function nftItemConfigToCell(config: NftItemConfig): Cell {
    const { index, collection_address, owner_address, content } = config;
    return beginCell()
        .storeUint(index, 64)
        .storeAddress(collection_address)
        .storeAddress(owner_address)
        .storeRef(content)
        .endCell();
}

export function nftItemLiteConfigToCell(config: NftItemConfigLite) {
    const { index, collection_address } = config;
    return beginCell().storeUint(index, 64).storeAddress(collection_address).endCell();
}

export const opCodes = {
    transfer: 0x5fcc3d14,
    ownership_assigned: 0x05138d91,
    get_static_data: 0x2fcb26a2,
};

export class NftItem implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new NftItem(address);
    }

    static createFromConfig(config: NftItemConfig, code: Cell, workchain = 0) {
        const data = nftItemConfigToCell(config);
        const init = { code, data };
        return new NftItem(contractAddress(workchain, init), init);
    }

    static createFromLiteConfig(config: NftItemConfigLite, code: Cell, workchain = 0) {
        const data = nftItemLiteConfigToCell(config);
        const init = { code, data };
        return new NftItem(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendTransferOwnership(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        transfer_to: Address,
        response_destination?: Address,
        message_with_forward_amount_to_new_owner?: string,
        forward_amount?: bigint,
        query_id?: number,
    ) {
        let body_builder = beginCell()
            .storeUint(opCodes.transfer, 32)
            .storeUint(query_id ?? 0, 64)
            .storeAddress(transfer_to);

        if (response_destination) {
            body_builder = body_builder.storeAddress(response_destination);
        } else {
            body_builder = body_builder.storeUint(0, 2);
        }

        body_builder = body_builder.storeInt(0, 1).storeCoins(forward_amount ?? 0);

        if (message_with_forward_amount_to_new_owner && forward_amount) {
            const message_cell = beginCell().storeStringTail(message_with_forward_amount_to_new_owner).endCell();
            body_builder = body_builder.storeRef(message_cell);
        }

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body_builder.endCell(),
        });
    }

    async sendGetStaticData(provider: ContractProvider, via: Sender, value: bigint, query_id?: number) {
        const bodyBuilder = beginCell()
            .storeUint(opCodes.get_static_data, 32)
            .storeUint(query_id ?? 0, 64)
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder,
        });
    }

    async sendInit(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        new_owner: Address,
        message_with_forward_amount_to_new_owner?: string,
        forward_amount?: bigint,
    ) {
        const content = beginCell().storeStringTail('nft-2.json').endCell();
        const bodyBuilder = beginCell().storeAddress(new_owner).storeRef(content);
        if (message_with_forward_amount_to_new_owner && forward_amount) {
            bodyBuilder.storeCoins(forward_amount).storeStringTail(message_with_forward_amount_to_new_owner);
        }

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder.endCell(),
        });
    }

    async getNftData(provider: ContractProvider) {
        const { stack } = await provider.get('get_nft_data', []);
        return {
            init: stack.readNumber(),
            index: stack.readNumber(),
            collectionAddress: stack.readAddress(),
            ownerAddress: stack.readAddress(),
            content: stack.readString(),
        };
    }
}
