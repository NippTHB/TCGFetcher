document.getElementById('fetchForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const input = document.getElementById('cardInput').value.trim();
  const result = document.getElementById('result');
  result.innerHTML = '<p>Fetching data...</p>';

  try {
    const cardData = await resolveInputViaHareruya(input);
    const searchQuery = encodeURIComponent(cardData.nameEN || input);

    const fallbackLinks = {
      pokemon: `https://www.pokemon-card.com/card-search/index.php?keyword=${encodeURIComponent(cardData.nameJP || '')}`,
      bulbapedia: `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(cardData.nameEN || '').replace(/\s/g, '_')}`,
      hareruya: `https://www.hareruya2.com/search?keyword=${encodeURIComponent(input)}`
    };

    // Priority: pokemon-card.com > Bulbapedia > Hareruya
    let picLink = fallbackLinks.pokemon;
    if (!cardData.picSource || cardData.picSource === 'none') {
      picLink = fallbackLinks.bulbapedia;
    }
    if (!cardData.nameJP && !cardData.nameEN) {
      picLink = fallbackLinks.hareruya;
    }

    result.innerHTML = `
      <div class="card-display">
        <ul>
          <li><strong>Card (JP):</strong> ${cardData.nameJP || '—'} ${cardData.number || ''}</li>
          <li><strong>Card (EN):</strong> ${cardData.nameEN || '—'} ${cardData.number || ''}</li>
          <li><strong>Logo:</strong> ${cardData.setCode || '—'}</li>
          <li><strong>Set:</strong> ${cardData.setNameJP || '—'} / ${cardData.setNameEN || '—'}</li>
          <li><strong>Release Year:</strong> ${cardData.releaseYear || '—'}</li>
          <li><strong>Rarity:</strong> ${cardData.rarity || '—'}</li>
          <li><strong>Illustrator:</strong> ${cardData.illustrator || '—'}</li>
          <li><strong>Condition:</strong> NM</li>
          <li><strong>Price Paid (JPY):</strong> ¥—</li>
          <li><strong>eBay Price (USD):</strong> <a href="https://www.pricecharting.com/search-products?q=${searchQuery}" target="_blank">Price</a><br>
            <small><a href="https://www.ebay.com/sch/i.html?_nkw=${searchQuery}" target="_blank">eBay</a></small>
          </li>
          <li><strong>PIC:</strong> <a href="${picLink}" target="_blank">View</a></li>
          <li><strong>Buy Again?</strong> —</li>
        </ul>
      </div>
    `;
  } catch (err) {
    result.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
  }
});

async function resolveInputViaHareruya(input) {
  try {
    const searchUrl = `https://www.hareruya2.com/search?keyword=${encodeURIComponent(input)}`;
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`);
    const data = await response.json();
    const html = data.contents;

    const nameEN = input.split(/\d/)[0].trim();
    const numberMatch = html.match(/(\d{2,3})\/(\d{2,3})/);
    const number = numberMatch ? numberMatch[0] : '';
    const rarityMatch = html.match(/>(RR|SR|UR|R|U|C)<\/span>/);
    const rarity = rarityMatch ? rarityMatch[1] : '';

    const nameJPMatch = html.match(/<div class="product-name">([^<]+)<\/div>/);
    const nameJP = nameJPMatch ? nameJPMatch[1].trim() : '';

    return {
      nameEN,
      nameJP,
      number,
      rarity,
      setCode: '',
      setNameJP: '',
      setNameEN: '',
      releaseYear: '',
      illustrator: '',
      picSource: nameJP ? 'hareruya' : 'none'
    };
  } catch (err) {
    throw new Error('Failed to fetch from Hareruya2.');
  }
}
