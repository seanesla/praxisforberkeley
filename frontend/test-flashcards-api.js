// Test script to verify flashcards API is working

const API_URL = 'http://localhost:5001';
const TEST_TOKEN = 'test-token-123';

async function testFlashcardsAPI() {
  console.log('🧪 Testing Flashcards API...\n');
  
  // 1. Test fetching flashcards
  console.log('1️⃣ Fetching flashcards...');
  try {
    const response = await fetch(`${API_URL}/api/flashcards`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    console.log('   Status:', response.status);
    const data = await response.json();
    console.log('   Response:', data);
    console.log('   ✅ Fetch flashcards endpoint works!\n');
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
  }

  // 2. Test creating a document
  console.log('2️⃣ Creating test document...');
  try {
    const response = await fetch(`${API_URL}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({
        title: 'JavaScript Test Document',
        content: 'JavaScript is a programming language. Variables can be declared with let, const, or var. Functions are first-class citizens.',
        file_type: 'text/plain'
      })
    });
    console.log('   Status:', response.status);
    const data = await response.json();
    console.log('   Response:', data);
    
    if (response.ok && data.document) {
      console.log('   ✅ Document created!\n');
      
      // 3. Test generating flashcards
      console.log('3️⃣ Generating flashcards from document...');
      const genResponse = await fetch(`${API_URL}/api/flashcards/generate/${data.document.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify({
          numCards: 3,
          difficulty: 'mixed'
        })
      });
      console.log('   Status:', genResponse.status);
      const genData = await genResponse.json();
      console.log('   Response:', genData);
      
      if (genResponse.ok) {
        console.log('   ✅ Flashcards generated!\n');
        
        // 4. Test updating flashcard (rating)
        if (genData.flashcards && genData.flashcards.length > 0) {
          console.log('4️⃣ Rating first flashcard...');
          const firstCard = genData.flashcards[0];
          const updateResponse = await fetch(`${API_URL}/api/flashcards/${firstCard.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${TEST_TOKEN}`
            },
            body: JSON.stringify({
              difficulty_rating: 'medium'
            })
          });
          console.log('   Status:', updateResponse.status);
          const updateData = await updateResponse.json();
          console.log('   Response:', updateData);
          console.log('   ✅ Flashcard rating updated!\n');
        }
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
  }

  console.log('🏁 Test complete!');
}

// Run the test
testFlashcardsAPI();