import { Address, beginCell, toNano } from '@ton/core';
import { NftItem } from '../wrappers/NftItem';
import { FixedSale } from '../wrappers/FixedSale';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const NftAddress = Address.parse('EQBvmBV8MXO-AtTVP0noRkhCp9bumrePRz5RTiZNuwYAXBnt');
    const FixedSaleAddress = Address.parse('EQAshelfpDldq5Fuy0iMG03KWrlsIbM47QPPvE4nb8BjiJIL');

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

    ui.write('Done. Check it');
}
