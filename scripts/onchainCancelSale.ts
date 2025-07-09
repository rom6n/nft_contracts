import { Address, beginCell, toNano } from '@ton/core';
import { FixedSale } from '../wrappers/FixedSale';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const FixedSaleAddress = Address.parse('kQAIxcpxL-Ngx29Q0DPbudHqRo1VsNQGFMIKgxkgaDI8pWZf');

    if (!(await provider.isContractDeployed(FixedSaleAddress))) {
        ui.write(`Error: Contract at address ${FixedSaleAddress} is not deployed!`);
        return;
    }

    const fixedSale = provider.open(FixedSale.createFromAddress(FixedSaleAddress));

    await fixedSale.sendCancelSale(provider.sender(), toNano('0.05'));
    const dataAfter = await fixedSale.getFixPriceData();
    let attempt = 0;

    while (!dataAfter.is_completed) {
        attempt += 1;
        ui.write(`attempt: ${attempt}`);
        await sleep(2000);
    }
    ui.write('Done. Check it');
    ui.write(`DATA:\nis_completed: ${dataAfter.is_completed}`);
}
