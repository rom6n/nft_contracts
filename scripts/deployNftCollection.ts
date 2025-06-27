import { address, beginCell, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // kQAqivwExARzU_ecNElk3SEv27_uw8YDcdUf2b9b6mhNGMSb не используется
    // kQA_ySYQbmlwO6bq2jsrtTovhheMfRECql34f4HAqqpxu8jz нет сообщения
    // EQCBY2Lc4O4q0nCJjq4fco5KcQ511BOD0tQ8cDXk5DL7-cp9 нет сообщения
    // 0QAnMYMtOGpTaKFBkxnmq8WPByAR3VTairCKC0l5YrXolE36 нет сообщения
    // kQCYyvm9du4WAxGhaf6ZUNFIS2Akt8SwfgPFo1qYu0ykX052 Ошибка отображения NFT ITEM в tonkeeper
    // 0QBCSNtcjQ0AlQhkYhvzdrqx5G479TPfy2IWucS7oJfIPouX нет сообщения
    // kQDIXbyWIfHUK0d6_KkUK9vvCJSklT01TSgCWD99d2ZWh-Xw

    const common_content = beginCell().storeStringTail('https://rom6n.github.io/mc1f/nft-c1-item-').endCell();
    const collection_content = beginCell()
        .storeUint(1, 8)
        .storeStringTail('https://rom6n.github.io/mc1f/nft-c1-collection.json')
        .endCell();
    const content = beginCell().storeRef(collection_content).storeRef(common_content).endCell();
    const royalty_params = beginCell()
        .storeUint(330, 16)
        .storeUint(1000, 16)
        .storeAddress(address('0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf'))
        .endCell(); // comission to owner 33% (user that created collection)
    const nft_item_code = await compile('NftItem');

    const nftCollection = provider.open(
        NftCollection.createFromConfig(
            {
                owner_address: address('0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf'),
                next_item_index: 1,
                content,
                nft_item_code,
                royalty_params,
                editor_address: address('0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf'),
            },
            await compile('NftCollection'),
        ),
    );

    await nftCollection.sendDeploy(provider.sender(), toNano('0.01'));

    await provider.waitForDeploy(nftCollection.address);

    // run methods on `nftCollection`
}
