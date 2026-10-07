# start.ps1
Write-Host "Starting RateDeck Seeder..."
$env:DATABASE_URL="postgres://ratedeck:ratedeck_password@localhost:5432/ratedeck"

Write-Host "Running Seeder script with tsx..."
npx tsx src/index.ts

Write-Host "Seeding complete!"
