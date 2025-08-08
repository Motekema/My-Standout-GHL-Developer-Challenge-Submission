/**
 * GHL DEVELOPER CHALLENGE - LEAD ROUTING SYSTEM
 * Multi-location fitness franchise lead routing with capacity management
 * 
 * This custom code action intelligently routes leads based on:
 * - Geographic proximity (zip code)
 * - Lead quality score
 * - Location capacity and availability
 * - Business rules and fallback logic
 */

// ================== CONFIGURATION ==================
const CONFIG = {
  ZIP_RADIUS_MILES: 25,
  HIGH_SCORE_THRESHOLD: 80,
  MAX_DAILY_LEADS_PER_LOCATION: 50,
  FALLBACK_ENABLED: true,
  WEBHOOK_URL: process.env.ANALYTICS_WEBHOOK_URL || '',
  GHL_API_KEY: process.env.GHL_API_KEY || '',
  // Free APIs
  ZIPPOPOTAM_API: 'http://api.zippopotam.us',
  NOMINATIM_API: 'https://nominatim.openstreetmap.org',
  WEBHOOK_SITE_API: 'https://webhook.site', // For testing webhooks
  JSONBIN_API: 'https://api.jsonbin.io/v3', // Free JSON storage
  JSONBIN_API_KEY: process.env.JSONBIN_API_KEY || '' // Get free at jsonbin.io
};

// ================== UTILITY FUNCTIONS ==================

/**
 * Get geographic coordinates for a zip code using free Zippopotam API
 */
async function getZipCoordinates(zipCode) {
  try {
    const response = await fetch(`${CONFIG.ZIPPOPOTAM_API}/us/${zipCode}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'GHL-Lead-Router/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Zip code lookup failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.places && data.places.length > 0) {
      return {
        lat: parseFloat(data.places[0].latitude),
        lng: parseFloat(data.places[0].longitude),
        city: data.places[0]['place name'],
        state: data.places[0]['state abbreviation']
      };
    }
    
    throw new Error('No coordinates found for zip code');
  } catch (error) {
    console.error(`Error getting coordinates for zip ${zipCode}:`, error);
    return null;
  }
}

/**
 * Calculate distance between two zip codes using real API data
 */
async function calculateDistanceReal(zip1, zip2) {
  try {
    const [coords1, coords2] = await Promise.all([
      getZipCoordinates(zip1),
      getZipCoordinates(zip2)
    ]);
    
    if (!coords1 || !coords2) {
      return 999; // Unknown distance
    }
    
    return calculateHaversineDistance(coords1, coords2);
  } catch (error) {
    console.error('Error calculating distance:', error);
    return 999;
  }
}

/**
 * Haversine formula for calculating distance between two points
 */
function calculateHaversineDistance(coords1, coords2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLng = (coords2.lng - coords1.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
    
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Calculate distance between two zip codes (simplified haversine formula)
 * In production, this would integrate with Google Maps Distance Matrix API
 */
function calculateDistance(zip1, zip2) {
  // Mock implementation - in real scenario, use Google Maps API
  const zipCoords = {
    '90001': { lat: 34.0224, lng: -118.2437 },
    '90210': { lat: 34.0901, lng: -118.4065 },
    '10001': { lat: 40.7505, lng: -73.9934 },
    // Add more zip codes as needed
  };
  
  const coords1 = zipCoords[zip1];
  const coords2 = zipCoords[zip2];
  
  if (!coords1 || !coords2) return 999; // Unknown distance
  
  const R = 3959; // Earth's radius in miles
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLng = (coords2.lng - coords1.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
    
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Get nearest locations within radius, sorted by distance
 */
async function getNearestLocations(leadZip, locations) {
  try {
    // First try real API for accurate distances
    const locationsWithDistance = await Promise.all(
      locations.map(async (location) => {
        try {
          const distance = await calculateDistanceReal(leadZip, location.zipCode);
          return { ...location, distance };
        } catch (error) {
          // Fallback to mock calculation if API fails
          const distance = calculateDistance(leadZip, location.zipCode);
          return { ...location, distance };
        }
      })
    );
    
    return locationsWithDistance
      .filter(loc => loc.distance <= CONFIG.ZIP_RADIUS_MILES)
      .sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error calculating distances:', error);
    // Fallback to original order if all distance calculations fail
    return locations.map(loc => ({ ...loc, distance: 999 }));
  }
}

/**
 * Calculate lead score based on multiple factors
 */
function calculateLeadScore(lead) {
  let score = lead.leadScore || 0;
  
  // Boost score based on lead source
  const sourceMultipliers = {
    'facebook': 1.2,
    'google': 1.1,
    'website': 1.0,
    'referral': 1.3,
    'walk-in': 0.9
  };
  
  score *= sourceMultipliers[lead.source] || 1.0;
  
  // Boost for complete profile
  if (lead.phone && lead.email && lead.firstName) score += 10;
  
  // Time-based scoring (leads during business hours get boost)
  const hour = new Date().getHours();
  if (hour >= 9 && hour <= 17) score += 5;
  
  return Math.min(100, Math.round(score));
}

/**
 * Check location capacity and availability using real data storage
 */
async function checkLocationCapacity(location) {
  try {
    // Try to get real-time data from JSONBin (free JSON storage)
    if (CONFIG.JSONBIN_API_KEY) {
      const capacityData = await getLocationCapacityFromAPI(location.id);
      if (capacityData) {
        return capacityData;
      }
    }
    
    // Fallback to simulated data
    const today = new Date().toISOString().split('T')[0];
    const currentLeads = location.dailyLeadCount || 0;
    
    return {
      hasCapacity: currentLeads < CONFIG.MAX_DAILY_LEADS_PER_LOCATION,
      availableSlots: CONFIG.MAX_DAILY_LEADS_PER_LOCATION - currentLeads,
      isOperational: location.status === 'active',
      businessHours: location.businessHours || { open: 6, close: 22 },
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error checking capacity:', error);
    return { hasCapacity: false, availableSlots: 0, isOperational: false };
  }
}

/**
 * Get location capacity from real API (JSONBin.io - free tier)
 */
async function getLocationCapacityFromAPI(locationId) {
  try {
    if (!CONFIG.JSONBIN_API_KEY) return null;
    
    const response = await fetch(`${CONFIG.JSONBIN_API}/b/location-capacity-${locationId}`, {
      method: 'GET',
      headers: {
        'X-Master-Key': CONFIG.JSONBIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.record;
    }
    
    return null;
  } catch (error) {
    console.warn('Could not fetch real capacity data:', error.message);
    return null;
  }
}

/**
 * Update location capacity in real storage
 */
async function updateLocationCapacity(locationId, capacityData) {
  try {
    if (!CONFIG.JSONBIN_API_KEY) return false;
    
    const response = await fetch(`${CONFIG.JSONBIN_API}/b/location-capacity-${locationId}`, {
      method: 'PUT',
      headers: {
        'X-Master-Key': CONFIG.JSONBIN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...capacityData,
        lastUpdated: new Date().toISOString()
      })
    });
    
    return response.ok;
  } catch (error) {
    console.warn('Could not update capacity data:', error.message);
    return false;
  }
}

/**
 * Log routing decision for analytics using real webhook service
 */
async function logRoutingDecision(lead, selectedLocation, allLocations, reason) {
  const logData = {
    timestamp: new Date().toISOString(),
    leadId: lead.id,
    leadZip: lead.zip,
    leadScore: lead.finalScore,
    selectedLocation: selectedLocation?.name || 'NONE',
    selectedLocationId: selectedLocation?.id || null,
    reason: reason,
    availableLocations: allLocations.filter(loc => loc.capacity?.hasCapacity).length,
    totalLocations: allLocations.length,
    distance: selectedLocation?.distance || null,
    source: lead.source
  };
  
  try {
    // Try to send to configured webhook URL first
    if (CONFIG.WEBHOOK_URL && CONFIG.WEBHOOK_URL !== '') {
      await sendToWebhook(CONFIG.WEBHOOK_URL, logData);
    }
    
    // Also try JSONBin for persistent storage
    if (CONFIG.JSONBIN_API_KEY) {
      await storeAnalyticsData(logData);
    }
    
    // Always log to console for debugging
    console.log('Routing decision logged:', logData);
    
    return true;
  } catch (error) {
    console.error('Failed to log routing decision:', error);
    return false;
  }
}

/**
 * Send data to webhook endpoint
 */
async function sendToWebhook(url, data) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'GHL-Lead-Router/1.0'
      },
      body: JSON.stringify(data),
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.warn('Webhook delivery failed:', error.message);
    return false;
  }
}

/**
 * Store analytics data in JSONBin for persistence
 */
async function storeAnalyticsData(data) {
  try {
    if (!CONFIG.JSONBIN_API_KEY) return false;
    
    const binName = `analytics-${new Date().toISOString().split('T')[0]}`;
    
    // Try to get existing data for today
    let existingData = [];
    try {
      const getResponse = await fetch(`${CONFIG.JSONBIN_API}/b/${binName}`, {
        headers: { 'X-Master-Key': CONFIG.JSONBIN_API_KEY }
      });
      if (getResponse.ok) {
        const result = await getResponse.json();
        existingData = result.record || [];
      }
    } catch (e) {
      // Bin doesn't exist yet, start with empty array
    }
    
    // Add new data
    existingData.push(data);
    
    // Update or create bin
    const response = await fetch(`${CONFIG.JSONBIN_API}/b/${binName}`, {
      method: 'PUT',
      headers: {
        'X-Master-Key': CONFIG.JSONBIN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(existingData)
    });
    
    return response.ok;
  } catch (error) {
    console.warn('Could not store analytics data:', error.message);
    return false;
  }
}

// ================== MAIN ROUTING FUNCTION ==================

/**
 * Intelligent lead routing function for GHL Custom Code Action
 * Routes leads to optimal location based on multiple criteria
 */
async function routeLead(lead, locations) {
  try {
    // Input validation
    if (!lead || !lead.zip) {
      return { 
        error: "Invalid zip code", 
        code: "INVALID_ZIP",
        lead: null 
      };
    }
    
    if (!locations || locations.length === 0) {
      return { 
        error: "No locations available", 
        code: "NO_LOCATIONS",
        lead: null 
      };
    }
    
    // Calculate enhanced lead score
    lead.finalScore = calculateLeadScore(lead);
    
    // Get nearest locations
    const nearestLocations = await getNearestLocations(lead.zip, locations);
    
    if (nearestLocations.length === 0) {
      await logRoutingDecision(lead, null, locations, 'NO_NEARBY_LOCATIONS');
      return { 
        error: "No locations within service area", 
        code: "OUT_OF_RANGE",
        suggestedAction: "Collect lead for future expansion",
        lead: lead 
      };
    }
    
    // Check capacity for each location
    const locationsWithCapacity = await Promise.all(
      nearestLocations.map(async (location) => ({
        ...location,
        capacity: await checkLocationCapacity(location)
      }))
    );
    
    // Filter to available locations
    const availableLocations = locationsWithCapacity.filter(
      loc => loc.capacity.hasCapacity && loc.capacity.isOperational
    );
    
    if (availableLocations.length === 0) {
      // No capacity - implement fallback strategy
      if (CONFIG.FALLBACK_ENABLED) {
        const fallbackLocation = locationsWithCapacity
          .filter(loc => loc.capacity.isOperational)
          .sort((a, b) => b.capacity.availableSlots - a.capacity.availableSlots)[0];
          
        if (fallbackLocation) {
          await logRoutingDecision(lead, fallbackLocation, locations, 'FALLBACK_NO_CAPACITY');
          return {
            location: fallbackLocation,
            reason: "No capacity at nearest locations, routed to best available",
            isHighPriority: lead.finalScore >= CONFIG.HIGH_SCORE_THRESHOLD,
            waitlist: true,
            lead: lead
          };
        }
      }
      
      await logRoutingDecision(lead, null, locations, 'NO_CAPACITY_ANYWHERE');
      return { 
        error: "No capacity available at any location", 
        code: "NO_CAPACITY",
        suggestedAction: "Add to waitlist and notify management",
        lead: lead 
      };
    }
    
    // Route based on lead score and location priority
    let selectedLocation;
    let routingReason;
    
    if (lead.finalScore >= CONFIG.HIGH_SCORE_THRESHOLD) {
      // High-value leads get best available location
      selectedLocation = availableLocations[0]; // Closest with capacity
      routingReason = "High-value lead routed to closest available location";
    } else {
      // Regular leads can go to lower-priority locations
      const lowTrafficLocation = availableLocations.find(
        loc => loc.priority === "low-traffic"
      );
      
      selectedLocation = lowTrafficLocation || availableLocations[0];
      routingReason = lowTrafficLocation 
        ? "Standard lead routed to low-traffic location"
        : "Standard lead routed to closest available location";
    }
    
    // Log the decision
    await logRoutingDecision(lead, selectedLocation, locations, routingReason);
    
    return {
      location: selectedLocation,
      reason: routingReason,
      isHighPriority: lead.finalScore >= CONFIG.HIGH_SCORE_THRESHOLD,
      estimatedDistance: selectedLocation.distance,
      expectedResponseTime: selectedLocation.capacity.availableSlots > 10 ? "15 minutes" : "30 minutes",
      lead: { ...lead, routingTimestamp: new Date().toISOString() }
    };
    
  } catch (error) {
    console.error('Lead routing error:', error);
    return { 
      error: "Internal routing error", 
      code: "SYSTEM_ERROR",
      details: error.message,
      lead: lead 
    };
  }
}

// ================== TEST DATA ==================

const testLeads = [
  { 
    id: "lead_001",
    zip: "90001", 
    leadScore: 90, 
    source: "facebook",
    phone: "+1234567890",
    email: "john@example.com",
    firstName: "John"
  },
  { 
    id: "lead_002",
    zip: "90001", 
    leadScore: 50, 
    source: "website",
    phone: "+1234567891",
    email: "jane@example.com"
  },
  { 
    id: "lead_003",
    zip: "10001", 
    leadScore: 75, 
    source: "referral",
    phone: "+1234567892"
  },
  { 
    id: "lead_004",
    leadScore: 80, 
    source: "walk-in" // Missing zip - should error
  }
];

const testLocations = [
  { 
    id: "loc_001",
    name: "Downtown Fitness Hub", 
    zipCode: "90001",
    priority: "high-traffic", 
    status: "active",
    dailyLeadCount: 45, // Near capacity
    businessHours: { open: 5, close: 23 }
  },
  { 
    id: "loc_002",
    name: "Westside Wellness Center", 
    zipCode: "90210",
    priority: "low-traffic", 
    status: "active",
    dailyLeadCount: 15, // Good capacity
    businessHours: { open: 6, close: 22 }
  },
  { 
    id: "loc_003",
    name: "East Valley Gym", 
    zipCode: "90001",
    priority: "low-traffic", 
    status: "active",
    dailyLeadCount: 25, // Good capacity
    businessHours: { open: 6, close: 21 }
  },
  { 
    id: "loc_004",
    name: "Beach City Fitness", 
    zipCode: "90401",
    priority: "high-traffic", 
    status: "maintenance", // Not operational
    dailyLeadCount: 0
  },
  { 
    id: "loc_005",
    name: "NYC Manhattan Gym", 
    zipCode: "10001",
    priority: "high-traffic", 
    status: "active",
    dailyLeadCount: 30
  }
];

// ================== TEST SCENARIOS ==================

async function runComprehensiveTests() {
  console.log("🧪 COMPREHENSIVE LEAD ROUTING TESTS\n");
  console.log("=" .repeat(60));
  
  for (let i = 0; i < testLeads.length; i++) {
    const lead = testLeads[i];
    console.log(`\n📋 TEST ${i + 1}: ${lead.firstName || 'Anonymous'} Lead (ID: ${lead.id})`);
    console.log(`   Source: ${lead.source} | Score: ${lead.leadScore} | Zip: ${lead.zip || 'MISSING'}`);
    console.log("-".repeat(40));
    
    try {
      const result = await routeLead(lead, testLocations);
      
      if (result.error) {
        console.log(`❌ ROUTING FAILED: ${result.error}`);
        console.log(`   Error Code: ${result.code}`);
        if (result.suggestedAction) {
          console.log(`   Suggested Action: ${result.suggestedAction}`);
        }
      } else {
        console.log(`✅ ROUTED SUCCESSFULLY`);
        console.log(`   Location: ${result.location.name} (${result.location.id})`);
        console.log(`   Distance: ${result.estimatedDistance?.toFixed(1) || 'N/A'} miles`);
        console.log(`   Reason: ${result.reason}`);
        console.log(`   High Priority: ${result.isHighPriority ? 'YES' : 'NO'}`);
        console.log(`   Response Time: ${result.expectedResponseTime}`);
        if (result.waitlist) {
          console.log(`   ⚠️  Added to waitlist (no immediate capacity)`);
        }
      }
    } catch (error) {
      console.log(`💥 SYSTEM ERROR: ${error.message}`);
    }
  }
  
  // Additional edge case tests
  console.log("\n" + "=".repeat(60));
  console.log("🔬 EDGE CASE TESTS");
  console.log("=".repeat(60));
  
  // Test with no locations
  console.log("\n📋 EDGE CASE 1: No locations available");
  const noLocationResult = await routeLead(testLeads[0], []);
  console.log(`Result: ${noLocationResult.error || 'SUCCESS'}`);
  
  // Test with all locations at capacity
  console.log("\n📋 EDGE CASE 2: All locations at capacity");
  const overCapacityLocations = testLocations.map(loc => ({
    ...loc,
    dailyLeadCount: 55 // Over the 50 limit
  }));
  const capacityResult = await routeLead(testLeads[0], overCapacityLocations);
  console.log(`Result: ${capacityResult.error || 'SUCCESS'}`);
  if (capacityResult.waitlist) {
    console.log(`Fallback location: ${capacityResult.location?.name || 'None'}`);
  }
  
  // Test with out-of-range zip
  console.log("\n📋 EDGE CASE 3: Out of service area");
  const outOfRangeResult = await routeLead(
    { id: "test", zip: "99999", leadScore: 85, source: "website" }, 
    testLocations
  );
  console.log(`Result: ${outOfRangeResult.error || 'SUCCESS'}`);
}

// ================== RUN TESTS ==================
(async () => {
  console.log("🚀 STARTING GHL LEAD ROUTING SYSTEM TESTS");
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log(`⚙️  Configuration: High Score Threshold = ${CONFIG.HIGH_SCORE_THRESHOLD}, Max Daily Leads = ${CONFIG.MAX_DAILY_LEADS_PER_LOCATION}`);
  
  await runComprehensiveTests();
  
  console.log("\n" + "=".repeat(60));
  console.log("✨ TESTING COMPLETE");
  console.log("=".repeat(60));
})();
