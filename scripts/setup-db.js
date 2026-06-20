import pg from 'pg';

const createTableSQL = `
-- Create trades table if not exists
CREATE TABLE IF NOT EXISTS public.trades (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  "entryTime" TEXT NOT NULL,
  "exitTime" TEXT NOT NULL,
  segment TEXT NOT NULL,
  product TEXT NOT NULL,
  action TEXT NOT NULL,
  symbol TEXT NOT NULL,
  qty BIGINT NOT NULL,
  "entryPrice" DOUBLE PRECISION NOT NULL,
  "exitPrice" DOUBLE PRECISION NOT NULL,
  "slippagePoints" DOUBLE PRECISION DEFAULT 0,
  "stopLoss" DOUBLE PRECISION DEFAULT 0,
  target DOUBLE PRECISION DEFAULT 0,
  strategy TEXT,
  "rulesFollowed" TEXT[],
  emotion TEXT,
  mistake TEXT,
  notes TEXT,
  "strikePrice" DOUBLE PRECISION,
  "optionType" TEXT,
  "isExpiryDay" BOOLEAN NOT NULL,
  "durationMinutes" BIGINT NOT NULL,
  "grossPnL" DOUBLE PRECISION NOT NULL,
  brokerage DOUBLE PRECISION NOT NULL,
  taxes DOUBLE PRECISION NOT NULL,
  "netPnL" DOUBLE PRECISION NOT NULL,
  roi DOUBLE PRECISION NOT NULL,
  "actualRR" DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public access (simplified for testing)
DROP POLICY IF EXISTS "Enable access to everyone" ON public.trades;
CREATE POLICY "Enable access to everyone" ON public.trades
  FOR ALL USING (true) WITH CHECK (true);
`;

async function main() {
  const connectionString = process.argv[2];

  if (!connectionString) {
    console.error("ERROR: Please provide your Supabase PostgreSQL connection string.");
    console.log("Usage: node scripts/setup-db.js \"postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres\"");
    process.exit(1);
  }

  console.log("Connecting to Supabase PostgreSQL database...");
  const client = new pg.Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false // Required for Supabase SSL connections
    }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");
    console.log("Creating tables and policies...");
    
    await client.query(createTableSQL);
    
    console.log("SUCCESS: Database schema deployed successfully! 'trades' table is ready.");
  } catch (err) {
    console.error("ERROR: Failed to deploy database schema:");
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
