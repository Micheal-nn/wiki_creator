// 测试脚本: 测试 arXiv 和 Semantic Scholar 搜索
const fetch = require('node:node:http');

async function testArxiv() {
  console.log('Testing arXiv API...');
  try {
    const response = await fetch('https://export.arxiv.org/api/query?search_query=all:machine%20learning&start=0&max_results=5', {
      headers: { 'Accept': 'application/json' }
    });
    console.log('arXiv Response Status:', response.status);
    
    const data = await response.text();
    // 检查 for 'entry' tags
    const entryCount = (data.match(/<entry>/g) || []).length;
    console.log(`Found ${entryCount} entries`);
    
    if (entryCount > 0) {
      console.log('✅ arXiv search works! - found results');
      return true;
    } else {
      console.log('❌ arXiv returned 0 results');
      return false;
    }
  } catch (error) {
    console.error('arXiv fetch failed:', error.message);
    return false;
  }
}

async function testSemanticScholar() {
  console.log('\nTesting Semantic Scholar API...');
  try {
    const response = await fetch('https://api.semanticscholar.org/graph/v1/paper/search?query=machine%20learning&limit=5&fields=title,abstract,citationCount,authors,url,year', {
      headers: { 'Accept': 'application/json' }
    });
    console.log('Semantic Scholar Response Status:', response.status);
    
    const response_data = await response.json();
    console.log('Semantic Scholar Response:', JSON.stringify(response_data, null, 2));
    
    if (response_data && response_data.data && response_data.data.length > 0) {
      console.log(`✅ Semantic Scholar search works! - found ${response_data.data.length} results`);
      console.log('First paper title:', response_data.data[0].title);
      return true;
    } else {
      console.log('❌ Semantic Scholar returned 0 results');
      return false;
    }
  } catch (error) {
    console.error('Semantic Scholar fetch failed:', error.message);
    return false;
  }
}

async function runTests() {
  const arxivResult = await testArxiv();
  const s2Result = await testSemanticScholar();
  
  console.log('\n=== Test Results ===');
  console.log('arXiv:', arxivResult ? '✅ PASS' : '❌ FAIL');
  console.log('Semantic Scholar:', s2Result ? '✅ PASS' : '❌ FAIL');
  
  if (arxivResult && s2Result) {
    console.log('\n✅ All API tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed - check the logs above');
    process.exit(1);
  }
}

runTests();
