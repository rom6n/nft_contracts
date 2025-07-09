import { Address, beginCell, toNano } from '@ton/core';
import { FixedSale } from '../wrappers/FixedSale';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const FixedSaleAddress = Address.parse('EQB4i8WWF2SP9inyMWUY1psu3Bwmz5w4NaHtTL9Mbe6a_pZe');

    if (!(await provider.isContractDeployed(FixedSaleAddress))) {
        ui.write(`Error: Contract at address ${FixedSaleAddress} is not deployed!`);
        return;
    }

    const fixedSale = provider.open(FixedSale.createFromAddress(FixedSaleAddress));

    await fixedSale.sendBuy(provider.sender(), toNano(1 + 0.07));

    ui.write('✅ Done. Check it');
}
