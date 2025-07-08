import { toNano } from '@ton/core';
import { MarketplaceContract } from '../wrappers/MarketplaceContract';
import { compile, NetworkProvider } from '@ton/blueprint';
import { mnemonicToPrivateKey } from '@ton/crypto';

export async function run(provider: NetworkProvider) {
    require('dotenv').config();
    const words = process.env.SEED_WORDS?.split(',') ?? [];
    const privateKey = await mnemonicToPrivateKey(words);
    
    const public_key = privateKey.publicKey;
    
    const marketplaceContract = provider.open(MarketplaceContract.createFromConfig(
        {
            seqno: 0,
            subwallet_id: 0x6bd21f9b,
            public_key,
        }, await compile('MarketplaceContract')));

    await marketplaceContract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(marketplaceContract.address);

    // run methods on `marketplaceContract`
}
