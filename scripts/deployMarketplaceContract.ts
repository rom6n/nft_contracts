import { toNano } from '@ton/core';
import { MarketplaceContract } from '../wrappers/MarketplaceContract';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const marketplaceContract = provider.open(MarketplaceContract.createFromConfig({
        
    }, await compile('MarketplaceContract')));

    await marketplaceContract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(marketplaceContract.address);

    // run methods on `marketplaceContract`
}
