import { Address, beginCell, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse('kQA_ySYQbmlwO6bq2jsrtTovhheMfRECql34f4HAqqpxu8jz');

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const nftCollection = provider.open(NftCollection.createFromAddress(address));

    //const MessageBefore = await myContract.getContractData();
    //let random = Math.floor(Math.random() * 100);

    //await myContract.sendMessageEdit(provider.sender(), toNano('0.01'), `TEST MESSAGE ONCHAIN №${random}`.toString());
    //await myContract.sendDeleteMessage(provider.sender(), toNano('0.02'));
    const dataBefore = await nftCollection.getCollectionData2();

    const nft_content = beginCell()
        .storeAddress(Address.parse('0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf'))
        .storeRef(beginCell().storeStringTail('1.json').endCell())
        .storeCoins(toNano('0.05'))
        .storeStringTail('Your NFT has deployed!')
        .endCell();

    await nftCollection.sendDeployNft(provider.sender(), toNano('0.15'), 1, toNano('0.12'), nft_content, 84627);

    ui.write('Waiting for next item index to edit...');

    let dataAfter = await nftCollection.getCollectionData2();
    let attempt = 1;
    while (dataAfter.next_item_index === dataBefore.next_item_index) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        dataAfter = await nftCollection.getCollectionData2();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('NFT successfully deployed !!');
    console.log(
        `FULL DATA:\nOwner: ${dataAfter.owner}\nnext item index: ${dataAfter.next_item_index}\ncollection content: ${dataAfter.collection_content}`,
    );
}
