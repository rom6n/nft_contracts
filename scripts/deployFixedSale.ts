import { Address, beginCell, contractAddress, toNano } from '@ton/core';
import { FixedSale } from '../wrappers/FixedSale';
import { MarketplaceContract } from '../wrappers/MarketplaceContract';
import { fixedSaleConfigToCell } from '../wrappers/FixedSale';
import { compile, NetworkProvider } from '@ton/blueprint';
import { mnemonicToPrivateKey, sign } from '@ton/crypto';

export async function run(provider: NetworkProvider) {
    require('dotenv').config();
    const words = process.env.SEED_WORDS?.split(',') ?? [];
    const privateKey = await mnemonicToPrivateKey(words);
    const secret_key = privateKey.secretKey;

    const marketplaceContract = provider.open(
        MarketplaceContract.createFromAddress(Address.parse('kQA64pUp9DBPh8TqOj9PS6fstMTdiuoNxcpW_R3dm3G4jfOX')),
    );

    const ui = provider.ui();
    if (!(await provider.isContractDeployed(Address.parse('kQA64pUp9DBPh8TqOj9PS6fstMTdiuoNxcpW_R3dm3G4jfOX')))) {
        ui.write(`Error: Contract at address kQA64pUp9DBPh8TqOj9PS6fstMTdiuoNxcpW_R3dm3G4jfOX is not deployed!`);
        return;
    }

    // Наблюдаю за балансом этого контракта: EQAjqLqI_9l5vdVn5QydCmeCp3s16uJErnnN0eXC2vbtlXfJ
    // баланс на начало 09.07.2025: 0.042619597 TON

    const fixedSale = provider.open(
        FixedSale.createFromConfig(
            {
                is_completed: 0,
                created_at: Math.floor(Date.now() / 1000), // Current timestamp in seconds
                marketplace_address: Address.parse('kQA64pUp9DBPh8TqOj9PS6fstMTdiuoNxcpW_R3dm3G4jfOX'), // Replace with actual marketplace address
                nft_address: Address.parse('EQBvmBV8MXO-AtTVP0noRkhCp9bumrePRz5RTiZNuwYAXBnt'), // Replace with actual NFT address
                nft_owner_address: undefined,
                full_price: toNano('1.0'), // Set the full price for the sale
                marketplace_fee_address: Address.parse('0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf'), // Replace with actual marketplace fee address
                marketplace_fee: toNano('0.3'), // Set the marketplace fee
                royalty_address: Address.parse('0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf'), // Replace with actual royalty address
                royalty_amount: toNano('0.03'), // Set the royalty amount
                sold_at: 0, // Initially not sold
                query_id: BigInt(0), // Initial query ID
            },
            await compile('FixedSale'),
        ),
    );

    const data = fixedSaleConfigToCell({
        is_completed: 0,
        created_at: Math.floor(Date.now() / 1000), // Current timestamp in seconds
        marketplace_address: Address.parse('kQA64pUp9DBPh8TqOj9PS6fstMTdiuoNxcpW_R3dm3G4jfOX'), // Replace with actual marketplace address
        nft_address: Address.parse('EQBvmBV8MXO-AtTVP0noRkhCp9bumrePRz5RTiZNuwYAXBnt'), // Replace with actual NFT address
        nft_owner_address: undefined,
        full_price: toNano('1.0'), // Set the full price for the sale
        marketplace_fee_address: Address.parse('0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf'), // Replace with actual marketplace fee address
        marketplace_fee: toNano('0.04'), // Set the marketplace fee
        royalty_address: Address.parse('0QDU46qYz4rHAJhszrW9w6imF8p4Cw5dS1GpPTcJ9vqNSmnf'), // Replace with actual royalty address
        royalty_amount: toNano('0.03'), // Set the royalty amount
        sold_at: 0, // Initially not sold
        query_id: BigInt(0), // i think it must be random for each contract to create a lot contracts at the same time
    });

    const state_init = beginCell()
        .storeUint(6, 5)
        .storeRef(await compile('FixedSale'))
        .storeRef(data)
        .endCell();
    const forwardBody = beginCell().endCell();

    const fullData = beginCell().storeRef(state_init).storeRef(forwardBody).endCell();

    const signature = sign(fullData.hash(), secret_key);

    await marketplaceContract.sendDeployContract(provider.sender(), toNano('0.05'), signature, state_init, forwardBody);
    const code = await compile('FixedSale');
    const init = { code, data };

    ui.write(contractAddress(0, init).toString());
    await provider.waitForDeploy(contractAddress(0, init));

    // run methods on `fixedSale`
}
