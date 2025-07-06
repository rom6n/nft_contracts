import { Address, toNano} from '@ton/core';
import { FixedSale } from '../wrappers/FixedSale';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const fixedSale = provider.open(
        FixedSale.createFromConfig(
            {
                is_completed: 0,
                created_at: Math.floor(Date.now() / 1000), // Current timestamp in seconds
                marketplace_address: Address.parse('EQD1...'), // Replace with actual marketplace address
                nft_address: Address.parse('EQD1...'), // Replace with actual NFT address
                nft_owner_address: Address.parse('EQD1...'),
                full_price: toNano('1.0'), // Set the full price for the sale
                marketplace_fee_address: Address.parse('EQD1...'), // Replace with actual marketplace fee address
                marketplace_fee: toNano('0.01'), // Set the marketplace fee
                royalty_address: Address.parse('EQD1...'), // Replace with actual royalty address
                royalty_amount: toNano('0.01'), // Set the royalty amount
                sold_at: 0, // Initially not sold
                query_id: BigInt(0), // Initial query ID
            },
            await compile('FixedSale'),
        ),
    );

    await fixedSale.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(fixedSale.address);

    // run methods on `fixedSale`
}
