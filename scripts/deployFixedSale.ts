import { toNano } from '@ton/core';
import { FixedSale } from '../wrappers/FixedSale';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const fixedSale = provider.open(FixedSale.createFromConfig({}, await compile('FixedSale')));

    await fixedSale.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(fixedSale.address);

    // run methods on `fixedSale`
}
