const { Connection, Keypair, Transaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');

// Target wallet (your recipient address)
const TARGET_WALLET_ADDRESS = 'FjCm7NqrYc8e8hcdb69DXqJ3a5bTAbeHpRm5EU6Dwno9';

// Array of source wallets' private keys or seed phrases
// Format: { mnemonic: "..." } OR { privateKeyBase58: "..." }
const SOURCE_WALLETS = [
  // Example entries (replace with your own):
  {
    privateKeyBase58: 'YourSource1PrivateKeyInBase58',
    label: 'Wallet 1'
  },
  /* Add more wallets here */
];

// Solana cluster endpoint
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

async function drainFunds(source) {
  try {
    let sourceKeypair;
    
    if (source.privateKeyBase58) {
      const pkBuffer = bs58.decode(source.privateKeyBase58);
      sourceKeypair = Keypair.fromSecretKey(pkBuffer);
    }
    // For mnemonic, you need a library like bip39. Not included here for brevity.
    
    const fromAddress = sourceKeypair.publicKey;
    const balance = await connection.getBalance(fromAddress);
    
    if (balance < 0.005 * LAMPORTS_PER_SOL) {
      console.log(`⚠️ ${source.label}: Balance too low (${balance / LAMPORTS_PER_SOL} SOL). Skipping.`);
      return;
    }

    const lamportsToSend = balance - 5_000; // Subtract ~0.005 SOL fee
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromAddress,
        toPubkey: new PublicKey(TARGET_WALLET_ADDRESS),
        lamports: lamportsToSend,
      })
    );

    const signature = await connection.sendTransaction(transaction, [sourceKeypair]);
    
    console.log(`✅ ${source.label}: Sent ${lamportsToSend / LAMPORTS_PER_SOL} SOL. Signature: ${signature}`);
  } catch (error) {
    console.error(`❌ ${source.label}: Failed to drain funds. Error:`, error);
  }
}

// Run for all source wallets
async function main() {
  const promises = SOURCE_WALLETS.map((source, index) => {
    return new Promise((resolve) => setTimeout(() => {
      drainFunds(source).then(resolve);
    }, 1000 * (index + 1)); // Add delay to avoid rate limits
  });
  
  await Promise.all(promises);
}

main().catch(console.error);
