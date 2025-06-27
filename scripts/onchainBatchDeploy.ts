import { NetworkProvider, sleep } from '@ton/blueprint';
import { NftCollection } from '../wrappers/NftCollection';
import { Address, beginCell, toNano } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const address = Address.parse('kQDIXbyWIfHUK0d6_KkUK9vvCJSklT01TSgCWD99d2ZWh-Xw');

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    // -------------------------------USER CONSOLE------------------------------------------------------------//
    const amount_nfts = 1; // how many NFTs you want to deploy
    const new_owner_address = '0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf';
    const nft_metadata_link = '2.json';

    // --------------------------------------------------------------------------------------------------------//

    const nftCollection = provider.open(NftCollection.createFromAddress(address));

    const dataBefore = await nftCollection.getCollectionData2();

    const innerCell = beginCell().storeUint(0, 32).storeStringTail('Message').endCell();

    const nft_content = beginCell()
        .storeAddress(Address.parse(new_owner_address))
        .storeRef(beginCell().storeStringTail(nft_metadata_link).endCell()) // METADATA LINK !!!
        .storeCoins(toNano('0.05'))
        //.storeUint(0, 32)
        .storeStringTail('Hello')
        .endCell();

    await nftCollection.sendDeployBatchNft(
        provider.sender(),
        toNano(0.12 * amount_nfts), // 0.12 * amount
        dataBefore.next_item_index, // MIN index !!!!!
        amount_nfts + dataBefore.next_item_index - 1, // MAX index !!!!!!!
        nft_content,
        toNano('0.11'), // forward amount for each NFT item
        35458,
    );

    ui.write('Waiting for next item index to edit...');

    let attempt = 1;
    let dataAfter = await nftCollection.getCollectionData2();
    while (dataBefore.next_item_index === dataAfter.next_item_index) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        dataAfter = await nftCollection.getCollectionData2();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('NFTs successfully deployed !!\n');
    console.log(
        `FULL DATA:\nOwner: ${dataAfter.owner}\nnext item index: ${dataAfter.next_item_index}\ncollection content: ${dataAfter.collection_content}`,
    );
}
