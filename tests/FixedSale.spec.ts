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
    let deployer: SandboxContract<TreasuryContract>;
    let fixedSale: SandboxContract<FixedSale>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        fixedSale = blockchain.openContract(FixedSale.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await fixedSale.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
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
