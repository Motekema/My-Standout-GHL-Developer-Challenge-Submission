/**
 * Real API Integration Example
 * This file demonstrates the system working with actual free APIs
 */

// Test real API integration
async function testRealAPIs() {
  console.log('🔗 Testing Real API Integration\n');
  
  // Test 1: Real Zip Code Lookup
  console.log('1. Testing Zippopotam API (Zip Code Lookup)');
  try {
    const response = await fetch('http://api.zippopotam.us/us/90210');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Zippopotam API working');
      console.log(`   Beverly Hills, CA: ${data.places[0].latitude}, ${data.places[0].longitude}`);
    }
  } catch (error) {
    console.log('❌ Zippopotam API failed:', error.message);
  }
  
  // Test 2: Distance Calculation
  console.log('\n2. Testing Real Distance Calculation');
  try {
    const [coord1, coord2] = await Promise.all([
      getZipCoordinates('90210'), // Beverly Hills
      getZipCoordinates('90001')  // Los Angeles
    ]);
    
    if (coord1 && coord2) {
      const distance = calculateHaversineDistance(coord1, coord2);
      console.log('✅ Real distance calculation working');
      console.log(`   Distance from 90210 to 90001: ${distance.toFixed(1)} miles`);
    }
  } catch (error) {
    console.log('❌ Distance calculation failed:', error.message);
  }
  
  // Test 3: Webhook Delivery
  console.log('\n3. Testing Webhook Delivery');
  const testWebhookData = {
    test: true,
    timestamp: new Date().toISOString(),
    message: 'GHL Lead Router Test'
  };
  
  // Test with httpbin.org (free webhook testing service)
  try {
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testWebhookData)
    });
    
    if (response.ok) {
      console.log('✅ Webhook delivery working');
      console.log('   Test webhook sent to httpbin.org');
    }
  } catch (error) {
    console.log('❌ Webhook delivery failed:', error.message);
  }
  
  // Test 4: Lead Routing with Real APIs
  console.log('\n4. Testing Complete Lead Routing with Real APIs');
  
  const realTestLead = {
    id: "real_test_001",
    zip: "90210", // Beverly Hills
    leadScore: 85,
    source: "facebook",
    phone: "+1234567890",
    email: "test@example.com",
    firstName: "Test User"
  };
  
  const realTestLocations = [
    { 
      id: "loc_bh_001",
      name: "Beverly Hills Fitness", 
      zipCode: "90210",
      priority: "high-traffic", 
      status: "active",
      dailyLeadCount: 20
    },
    { 
      id: "loc_la_001",
      name: "LA Downtown Gym", 
      zipCode: "90001",
      priority: "low-traffic", 
      status: "active",
      dailyLeadCount: 15
    }
  ];
  
  try {
    console.log('   Processing lead with real APIs...');
    const routingResult = await routeLead(realTestLead, realTestLocations);
    
    if (routingResult.error) {
      console.log(`❌ Routing failed: ${routingResult.error}`);
    } else {
      console.log('✅ Lead routing successful with real APIs');
      console.log(`   Routed to: ${routingResult.location.name}`);
      console.log(`   Distance: ${routingResult.estimatedDistance?.toFixed(1) || 'N/A'} miles`);
      console.log(`   Reason: ${routingResult.reason}`);
    }
  } catch (error) {
    console.log('❌ Lead routing failed:', error.message);
  }
  
  console.log('\n🎉 Real API Integration Test Complete!');
  console.log('\nTo enable full functionality:');
  console.log('1. Get free JSONBin.io API key for data persistence');
  console.log('2. Set up webhook.site URL for webhook testing');
  console.log('3. Configure environment variables in .env file');
}

// Include the utility functions from the main file
async function getZipCoordinates(zipCode) {
  try {
    const response = await fetch(`http://api.zippopotam.us/us/${zipCode}`, {
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

function calculateHaversineDistance(coords1, coords2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLng = (coords2.lng - coords1.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
    
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Simplified routing function for testing
async function routeLead(lead, locations) {
  try {
    if (!lead || !lead.zip) {
      return { error: "Invalid zip code", code: "INVALID_ZIP" };
    }
    
    // Calculate real distances
    const locationsWithDistance = await Promise.all(
      locations.map(async (location) => {
        const distance = await calculateDistanceReal(lead.zip, location.zipCode);
        return { ...location, distance };
      })
    );
    
    // Find nearest available location
    const availableLocations = locationsWithDistance.filter(
      loc => loc.status === 'active' && loc.dailyLeadCount < 50
    ).sort((a, b) => a.distance - b.distance);
    
    if (availableLocations.length === 0) {
      return { error: "No available locations", code: "NO_CAPACITY" };
    }
    
    const selectedLocation = availableLocations[0];
    
    return {
      location: selectedLocation,
      estimatedDistance: selectedLocation.distance,
      reason: "Routed to nearest available location",
      isHighPriority: lead.leadScore >= 80
    };
    
  } catch (error) {
    return { error: "Routing error", details: error.message };
  }
}

async function calculateDistanceReal(zip1, zip2) {
  try {
    const [coords1, coords2] = await Promise.all([
      getZipCoordinates(zip1),
      getZipCoordinates(zip2)
    ]);
    
    if (!coords1 || !coords2) {
      return 999;
    }
    
    return calculateHaversineDistance(coords1, coords2);
  } catch (error) {
    return 999;
  }
}

// Run the test
if (typeof window === 'undefined') {
  testRealAPIs().catch(console.error);
}
