import { address, beginCell, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // kQAqivwExARzU_ecNElk3SEv27_uw8YDcdUf2b9b6mhNGMSb
    // kQA_ySYQbmlwO6bq2jsrtTovhheMfRECql34f4HAqqpxu8jz

    const common_content = beginCell().storeStringTail('https://rom6n.github.io/mc1f/nft-c1-item-').endCell();
    const collection_content = beginCell()
        .storeUint(1, 8)
        .storeStringTail('https://rom6n.github.io/mc1f/nft-c1-collection.json')
        .endCell();
    const content = beginCell().storeRef(collection_content).storeRef(common_content).endCell();
    const royalty_params = beginCell()
        .storeUint(3, 16)
        .storeUint(100, 16)
        .storeAddress(address('0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf'))
        .endCell(); // comission to owner 3% (user that created collection)
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

    await nftCollection.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(nftCollection.address);

    // run methods on `nftCollection`
}
