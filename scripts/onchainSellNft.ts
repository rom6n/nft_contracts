import { Address, beginCell, toNano } from '@ton/core';
import { NftItem } from '../wrappers/NftItem';
import { FixedSale } from '../wrappers/FixedSale';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const NftAddress = Address.parse('EQBvmBV8MXO-AtTVP0noRkhCp9bumrePRz5RTiZNuwYAXBnt');
    const FixedSaleAddress = Address.parse('EQB4i8WWF2SP9inyMWUY1psu3Bwmz5w4NaHtTL9Mbe6a_pZe');

    if (!((await provider.isContractDeployed(NftAddress)) && (await provider.isContractDeployed(FixedSaleAddress)))) {
        ui.write(`Error: Contract at address ${NftAddress} or ${FixedSaleAddress} is not deployed!`);
        return;
    }

    const nftItem = provider.open(NftItem.createFromAddress(NftAddress));
    const fixedSale = provider.open(FixedSale.createFromAddress(FixedSaleAddress));

    await nftItem.sendTransferOwnership(
        provider.sender(),
        toNano('0.05'),
        FixedSaleAddress,
        undefined,
        undefined,
        toNano('0.02'),
        303030,
    );
    let attempt = 0;
    let is_done = false;

    while (!is_done) {
        try {
            await fixedSale.getFixPriceData();
        } catch {
            attempt += 1;
            ui.setActionPrompt(`Attempt ${attempt}`);
            await sleep(2000);
        } /*finally {
            is_done = true;
            ui.write('Done. Check it');
            const dataAfter = await fixedSale.getFixPriceData();
            ui.write(`DATA: \nOwner: ${dataAfter.nft_owner_address}`);
        }*/
    }
}
