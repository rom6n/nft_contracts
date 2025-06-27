import { NetworkProvider, sleep } from '@ton/blueprint';
import { NftCollection } from '../wrappers/NftCollection';
import { Address, beginCell, toNano } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const address = Address.parse('kQA_ySYQbmlwO6bq2jsrtTovhheMfRECql34f4HAqqpxu8jz');

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    // -------------------------------USER CONSOLE------------------------------------------------------------//
    const new_owner_address = '0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf'; //'0QDxS3z3Pu6TPMk-p_K22KAxvLvpDEQU7LVqnmXEOiT5PCaf';
    // '0QDxS3z3Pu6TPMk-p_K22KAxvLvpDEQU7LVqnmXEOiT5PCaf'

    // --------------------------------------------------------------------------------------------------------//

    const nftCollection = provider.open(NftCollection.createFromAddress(address));

    const dataBefore = await nftCollection.getCollectionData2();

    await nftCollection.sendChangeOwner(provider.sender(), toNano('0.01'), Address.parse(new_owner_address), 49502);

    ui.write('Waiting for owner to change...');

    let attempt = 1;
    let dataAfter = await nftCollection.getCollectionData2();
    while (dataBefore.owner.toString({ testOnly: true }) === dataAfter.owner.toString({ testOnly: true })) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        dataAfter = await nftCollection.getCollectionData2();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write(
        `Owner successfully changed:\n${dataBefore.owner.toString({ testOnly: true })}  ->  ${dataAfter.owner.toString({ testOnly: true })}  !!\n`,
    );
    console.log(
        `FULL DATA:\nOwner: ${dataAfter.owner}\nnext item index: ${dataAfter.next_item_index}\ncollection content: ${dataAfter.collection_content}`,
    );
}
