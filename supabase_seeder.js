const fs = require('fs');
const path = require('path');

// 1. Environment Variable Parser (Zero Dependency)
function readEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env file not found in project root!');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split(/\r?\n/).forEach(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) return;
    
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value.trim();
    }
  });
  return env;
}

// 2. Fetch OBD-II DTC codes from GitHub raw source
async function fetchDTCCodes() {
  const url = 'https://raw.githubusercontent.com/mytrile/obd-trouble-codes/master/obd-trouble-codes.json';
  console.log(`🌐 Fetching OBD-II DTC codes from: ${url}`);
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch DTC codes: ${res.statusText}`);
  }
  
  const rawData = await res.json();
  const codes = [];
  
  // Format parsing from the array of objects: [{"P0100": "P0101", "Mass...": "Mass..."}]
  rawData.forEach(item => {
    const keys = Object.keys(item);
    if (keys.length >= 2) {
      const code = item[keys[0]];
      const description = item[keys[1]];
      
      if (code && description) {
        let category = 'Unknown';
        const firstLetter = code.charAt(0).toUpperCase();
        if (firstLetter === 'P') category = 'Powertrain';
        else if (firstLetter === 'C') category = 'Chassis';
        else if (firstLetter === 'B') category = 'Body';
        else if (firstLetter === 'U') category = 'Network';
        
        codes.push({
          code: code.trim(),
          description: description.trim(),
          category
        });
      }
    }
  });
  
  return codes;
}

// 3. Fetch Car Models from GitHub raw source
async function fetchCarModels() {
  const url = 'https://raw.githubusercontent.com/matthlavacka/car-list/master/car-list.json';
  console.log(`🌐 Fetching car list from: ${url}`);
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch car list: ${res.statusText}`);
  }
  
  const rawData = await res.json();
  const carModels = [];
  
  rawData.forEach(item => {
    const brand = item.brand ? item.brand.trim() : '';
    const models = item.models || [];
    
    if (brand) {
      models.forEach(model => {
        const cleanModel = model ? model.trim() : '';
        if (cleanModel && cleanModel.toLowerCase() !== 'other') {
          carModels.push({
            brand,
            model: cleanModel,
            vehicle_type: 'car'
          });
        }
      });
    }
  });
  
  return carModels;
}

// 4. Parse Local Motorcycle Models from vehicleData.ts
function parseLocalMotorcycleModels() {
  const vehicleDataPath = path.join(__dirname, 'src', 'data', 'vehicleData.ts');
  if (!fs.existsSync(vehicleDataPath)) {
    console.warn('⚠️ Warning: src/data/vehicleData.ts not found. Skipping local parsing.');
    return [];
  }
  
  console.log('📄 Parsing local vehicleData.ts for motorcycle models...');
  const content = fs.readFileSync(vehicleDataPath, 'utf8');
  const lines = content.split(/\r?\n/);
  
  const motoBrands = [
    'aprilia', 'bajaj', 'benelli', 'bmw_moto', 'cfmoto', 'ducati', 'harley', 'hero', 
    'honda_moto', 'husqvarna', 'indian', 'kawasaki', 'ktm', 'kuba', 'kymco', 'mondial', 
    'mv_agusta', 'peugeot_moto', 'rks', 'suzuki_moto', 'sym', 'triumph', 'tvs', 'vespa', 'yuki'
  ];
  
  const models = [];
  let currentBrand = null;
  let isParsingModels = false;
  
  lines.forEach(line => {
    // Check if we hit a brand declaration like: 'aprilia': [
    const brandMatch = line.match(/^\s*['"]([\w_]+)['"]\s*:\s*\[/);
    if (brandMatch) {
      currentBrand = brandMatch[1];
      isParsingModels = true;
      return;
    }
    
    if (isParsingModels && currentBrand) {
      if (line.includes(']')) {
        isParsingModels = false;
        currentBrand = null;
        return;
      }
      
      const modelMatches = line.matchAll(/['"]([^'"]+)['"]/g);
      for (const match of modelMatches) {
        const modelName = match[1];
        if (modelName && modelName.toLowerCase() !== 'other') {
          let cleanBrand = currentBrand;
          let type = 'car';
          
          if (motoBrands.includes(currentBrand)) {
            type = 'motorcycle';
            // clean brand string: e.g., honda_moto -> Honda
            cleanBrand = currentBrand.replace(/_moto$/, '').replace(/_/g, ' ');
            cleanBrand = cleanBrand.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            
            // Special brand mapping
            if (cleanBrand.toLowerCase() === 'harley') cleanBrand = 'Harley-Davidson';
            else if (cleanBrand.toLowerCase() === 'cfmoto') cleanBrand = 'CFMOTO';
            else if (cleanBrand.toLowerCase() === 'mv agusta') cleanBrand = 'MV Agusta';
            else if (cleanBrand.toLowerCase() === 'rks') cleanBrand = 'RKS';
            else if (cleanBrand.toLowerCase() === 'sym') cleanBrand = 'SYM';
            else if (cleanBrand.toLowerCase() === 'tvs') cleanBrand = 'TVS';
          } else {
            cleanBrand = cleanBrand.replace(/_car$/, '').replace(/_/g, ' ');
            cleanBrand = cleanBrand.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          }
          
          models.push({
            brand: cleanBrand,
            model: modelName,
            vehicle_type: type
          });
        }
      }
    }
  });
  
  return models;
}

// 5. Send API Batch Request with delay to prevent rate limit
async function sendBatch(supabaseUrl, apiKey, tableName, onConflictCol, batch) {
  const endpoint = `${supabaseUrl}/rest/v1/${tableName}?on_conflict=${onConflictCol}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(batch)
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`REST API error: ${response.status} - ${errText}`);
  }
}

// 6. Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main Orchestration Flow
async function main() {
  const env = readEnv();
  const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || env['EXPO_PUBLIC_SUPABASE_URL'] || '';
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env['SUPABASE_SERVICE_ROLE_KEY'] || 
                 process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || env['EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'] || 
                 process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] || '';
  
  const isUsingServiceRole = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || env['SUPABASE_SERVICE_ROLE_KEY'] || 
                                process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || env['EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY']);
  console.log(`🔑 Using Key Type: ${isUsingServiceRole ? 'Service Role Key (Admin)' : 'Anon Key (Public)'}`);
  
  if (!rawUrl || !apiKey) {
    console.error('❌ Error: Supabase URL and a valid API Key must be defined (in process.env or .env file)!');
    process.exit(1);
  }
  
  // Format Supabase URL (strip /rest/v1 suffix if present)
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
  console.log(`📡 Supabase Endpoint: ${supabaseUrl}`);
  
  // Create temp directory for saving fetched files
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  
  let dtcCodes = [];
  let vehicleModels = [];
  
  // ==========================================
  // PHASE 1: Fetching & Data Compilation
  // ==========================================
  try {
    // Get DTC codes
    dtcCodes = await fetchDTCCodes();
    fs.writeFileSync(path.join(tempDir, 'fetched_dtcs.json'), JSON.stringify(dtcCodes, null, 2));
    
    // Get external car list
    const remoteCars = await fetchCarModels();
    
    // Get local motorcycle & extra models
    const localVehicles = parseLocalMotorcycleModels();
    
    // Merge lists & dedup
    const combinedVehiclesMap = new Map();
    [...remoteCars, ...localVehicles].forEach(v => {
      const key = `${v.brand.toLowerCase()}|${v.model.toLowerCase()}`;
      // Local classifications or first match wins
      if (!combinedVehiclesMap.has(key)) {
        combinedVehiclesMap.set(key, v);
      } else {
        // If local is a motorcycle, prefer motorcycle classification
        if (v.vehicle_type === 'motorcycle') {
          combinedVehiclesMap.set(key, v);
        }
      }
    });
    
    vehicleModels = Array.from(combinedVehiclesMap.values());
    fs.writeFileSync(path.join(tempDir, 'fetched_vehicles.json'), JSON.stringify(vehicleModels, null, 2));
    
    console.log(`✅ Data compiled successfully.`);
    console.log(`   - DTC Codes: ${dtcCodes.length}`);
    console.log(`   - Vehicle Models: ${vehicleModels.length}`);
  } catch (err) {
    console.error('❌ Error in Phase 1 (Data Fetch & Compilation):', err.message);
    process.exit(1);
  }
  
  // ==========================================
  // PHASE 2: Seeding fault_codes Table
  // ==========================================
  console.log('\n🚀 Starting seeding Phase: fault_codes table...');
  const BATCH_SIZE = 200;
  const DELAY_MS = 500;
  
  let dtcInsertedCount = 0;
  for (let i = 0; i < dtcCodes.length; i += BATCH_SIZE) {
    const batch = dtcCodes.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(dtcCodes.length / BATCH_SIZE);
    
    try {
      await sendBatch(supabaseUrl, apiKey, 'fault_codes', 'code,category', batch);
      dtcInsertedCount += batch.length;
      console.log(`   [Batch ${batchNum}/${totalBatches}] Uploaded ${batch.length} fault codes.`);
      
      if (i + BATCH_SIZE < dtcCodes.length) {
        await sleep(DELAY_MS);
      }
    } catch (err) {
      console.error(`❌ Error uploading fault_codes batch ${batchNum}:`, err.message);
      console.error('⚠️ Make sure you have run the DDL schema script in your Supabase SQL Editor!');
      process.exit(1);
    }
  }
  console.log(`🎉 Seeding completed for fault_codes. Total loaded: ${dtcInsertedCount} codes.`);
  
  // ==========================================
  // PHASE 3: Seeding vehicle_models Table
  // ==========================================
  console.log('\n🚀 Starting seeding Phase: vehicle_models table...');
  let vehicleInsertedCount = 0;
  for (let i = 0; i < vehicleModels.length; i += BATCH_SIZE) {
    const batch = vehicleModels.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(vehicleModels.length / BATCH_SIZE);
    
    try {
      await sendBatch(supabaseUrl, apiKey, 'vehicle_models', 'brand,model', batch);
      vehicleInsertedCount += batch.length;
      console.log(`   [Batch ${batchNum}/${totalBatches}] Uploaded ${batch.length} vehicle models.`);
      
      if (i + BATCH_SIZE < vehicleModels.length) {
        await sleep(DELAY_MS);
      }
    } catch (err) {
      console.error(`❌ Error uploading vehicle_models batch ${batchNum}:`, err.message);
      console.error('⚠️ Make sure you have run the DDL schema script in your Supabase SQL Editor!');
      process.exit(1);
    }
  }
  
  console.log(`\n🎉 Seeding completed for vehicle_models. Total loaded: ${vehicleInsertedCount} models.`);
  console.log(`\n✨ Seeding automation completed successfully!`);
  
  // Cleanup temp files
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (cleanupErr) {
    // Ignore cleanup error
  }
}

main().catch(err => {
  console.error('❌ Uncaught Seeder Exception:', err);
  process.exit(1);
});
