import { SHA256U } from '@tact-lang/compiler';
import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';

export type NftCollectionConfig = {
    owner_address: Address;
    next_item_index: number;
    content: Cell;
    nft_item_code: Cell;
    royalty_params: Cell;
    editor_address: Address;
};

export function nftCollectionConfigToCell(config: NftCollectionConfig): Cell {
    return beginCell()
        .storeAddress(config.owner_address)
        .storeUint(config.next_item_index, 64)
        .storeRef(config.content)
        .storeRef(config.nft_item_code)
        .storeRef(config.royalty_params)
        .storeAddress(config.editor_address)
        .endCell();
}

export const opCodes = {
    deployNft: 1,
    deployBatchNft: 2,
    changeOwner: 3,
    changeContent: 4,
    changeRoyalty: 5,
    changeEditor: 6,
    changeCode: 10,
};

export class NftCollection implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new NftCollection(address);
    }

    static createFromConfig(config: NftCollectionConfig, code: Cell, workchain = 0) {
        const data = nftCollectionConfigToCell(config);
        const init = { code, data };
        return new NftCollection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeployNft(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        item_index: number,
        forward_amount: bigint,
        content: Cell,
        query_id?: number,
    ) {
        let bodyBuilder = beginCell()
            .storeUint(opCodes.deployNft, 32)
            .storeUint(query_id ?? 0, 64)
            .storeUint(item_index, 64)
            .storeCoins(forward_amount)
            .storeRef(content);

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder.endCell(),
        });
    }

    async sendDeployBatchNft(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        minIndex: number,
        maxIndex: number,
        content: Cell,
        forward_amount?: bigint,
        query_id?: number,
    ) {
        let dictBuilder = Dictionary.empty(Dictionary.Keys.Uint(64), Dictionary.Values.Cell());

        for (let index = minIndex; index <= maxIndex; index++) {
            const item = beginCell()
                .storeCoins(forward_amount ?? toNano('0.11'))
                .storeRef(content)
                .endCell();

            dictBuilder = dictBuilder.set(index, item);
        }

        let bodyBuilder = beginCell()
            .storeUint(2, 32)
            .storeUint(query_id ?? 0, 64)
            .storeDict(dictBuilder)
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder,
        });
    }

    async sendChangeOwner(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        new_owner: Address,
        query_id?: number,
    ) {
        let bodyBuilder = beginCell()
            .storeUint(opCodes.changeOwner, 32)
            .storeUint(query_id ?? 0, 64)
            .storeAddress(new_owner);

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder.endCell(),
        });
    }

    async sendChangeContent(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        new_content: Cell,
        query_id?: number,
    ) {
        let bodyBuilder = beginCell()
            .storeUint(opCodes.changeContent, 32)
            .storeUint(query_id ?? 0, 64)
            .storeRef(new_content);

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder.endCell(),
        });
    }

    async sendChangeRoyaltyParams(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        new_royalty: Cell,
        query_id?: number,
    ) {
        let bodyBuilder = beginCell()
            .storeUint(opCodes.changeRoyalty, 32)
            .storeUint(query_id ?? 0, 64)
            .storeRef(new_royalty);

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder.endCell(),
        });
    }

    async sendChangeEditor(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        new_editor: Address,
        query_id?: number,
    ) {
        let bodyBuilder = beginCell()
            .storeUint(opCodes.changeEditor, 32)
            .storeUint(query_id ?? 0, 64)
            .storeAddress(new_editor);

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder.endCell(),
        });
    }

    async sendChangeCode(provider: ContractProvider, via: Sender, value: bigint, new_code: Cell, query_id?: number) {
        let bodyBuilder = beginCell()
            .storeUint(opCodes.changeCode, 32)
            .storeUint(query_id ?? 0, 64)
            .storeRef(new_code);

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder.endCell(),
        });
    }

    async sendWrongOpCode(provider: ContractProvider, via: Sender, value: bigint, query_id?: number) {
        let bodyBuilder = beginCell()
            .storeUint(999, 32)
            .storeUint(query_id ?? 0, 64);

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyBuilder.endCell(),
        });
    }

    async getCollectionData(provider: ContractProvider) {
        const { stack } = await provider.get('get_all_collection_data', []);
        return {
            next_item_index: stack.readNumber(),
            owner: stack.readAddress(),
            collection_content: stack.readString(),
            common_content: stack.readString(),
            nft_item_code: stack.readCell(),
            royalty_params_min: stack.readNumber(),
            royalty_params_max: stack.readNumber(),
            royalty_params_address: stack.readAddress(),
            editor_address: stack.readAddress(),
        };
    }

    async getCollectionData2(provider: ContractProvider) {
        const { stack } = await provider.get('get_collection_data', []);
        return {
            next_item_index: stack.readNumber(),
            collection_content: stack.readString(),
            owner: stack.readAddress(),
        };
    }
}
