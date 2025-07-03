import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { FixedSale } from '../wrappers/FixedSale';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('FixedSale', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('FixedSale');
    });

    let blockchain: Blockchain;
    let marketplace_address: SandboxContract<TreasuryContract>;
    let nft_address: SandboxContract<TreasuryContract>;
    let owner_address: SandboxContract<TreasuryContract>;
    let royalty_address: SandboxContract<TreasuryContract>;
    let fixedSale: SandboxContract<FixedSale>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        nft_address = await blockchain.treasury('nft');
        owner_address = await blockchain.treasury('owner');
        marketplace_address = await blockchain.treasury('marketplace');
        royalty_address = await blockchain.treasury('royalty');

        fixedSale = blockchain.openContract(
            FixedSale.createFromConfig(
                {
                    is_completed: 0,
                    created_at: Math.floor(Date.now() / 1000), // Current timestamp in seconds
                    marketplace_address: marketplace_address.address,
                    nft_address: nft_address.address,
                    nft_owner_address: undefined,
                    full_price: toNano('1.0'), // Set the full price for the sale
                    marketplace_fee_address: marketplace_address.address,
                    marketplace_fee: toNano('0.01'), // Set the marketplace fee
                    royalty_address: royalty_address.address,
                    royalty_amount: toNano('0.01'), // Set the royalty amount
                    sold_at: 0, // Initially not sold
                    query_id: BigInt(0), // Initial query ID
                },
                code,
            ),
        );

        const deployResult = await fixedSale.sendDeploy(marketplace_address.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: marketplace_address.address,
            to: fixedSale.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and fixedSale are ready to use
    });
});
