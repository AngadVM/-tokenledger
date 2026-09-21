import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SeedPrice = {
  model: string;
  provider: string;
  inputPer1k: number;
  outputPer1k: number;
};

// Rates are per 1,000 tokens. Values are the providers' public list prices at
// seed time; treat them as notional — edit freely and re-seed.
const prices: SeedPrice[] = [
  { model: 'gpt-4o', provider: 'openai', inputPer1k: 0.0025, outputPer1k: 0.01 },
  { model: 'gpt-4o-mini', provider: 'openai', inputPer1k: 0.00015, outputPer1k: 0.0006 },
  { model: 'gpt-4.1', provider: 'openai', inputPer1k: 0.002, outputPer1k: 0.008 },
  { model: 'claude-sonnet-4', provider: 'anthropic', inputPer1k: 0.003, outputPer1k: 0.015 },
  { model: 'llama-3.3-70b-versatile', provider: 'groq', inputPer1k: 0.00005, outputPer1k: 0.00008 },
  { model: 'llama3.2:1b', provider: 'ollama', inputPer1k: 0, outputPer1k: 0 },
];

async function main(): Promise<void> {
  for (const price of prices) {
    await prisma.priceEntry.upsert({
      where: { model: price.model },
      update: price,
      create: price,
    });
  }
  console.log(`Seeded ${prices.length} price entries.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());