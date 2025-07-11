document.getElementById('fetchForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const input = document.getElementById('cardInput').value.trim();
  const result = document.getElementById('result');
  result.innerHTML = '<p>Fetching data...</p>';

  try {
    const cardData = parseCardInput(input);

    let jpCardInfo = await fetchPokemonCardJP(cardData);
    let bulbapediaInfo = await fetchBulbapediaInfo(cardData);

    // Fallback to pokemon-card.com data if Bulbapedia info is missing
    if (!bulbapediaInfo.nameEN || bulbapediaInfo.nameEN === '—') {
      bulbapediaInfo.nameEN = jpCardInfo.nameEN;
    }
    if (!bulbapediaInfo.setNameEN || bulbapediaInfo.setNameEN === '—') {
      bulbapediaInfo.setNameEN = jpCardInfo.setNameEN;
    }

    const searchQuery = encodeURIComponent(cardData.name || bulbapediaInfo.nameEN || jpCardInfo.nameJP);
    const priceChartingLink = `https://www.pricecharting.com/search-products?q=${searchQuery}`;
    const ebaySearchLink = `https://www.ebay.com/sch/i.html?_nkw=${searchQuery}`;

    result.innerHTML = `
      <div class="card-display">
        <img src="${jpCardInfo.image}" alt="${bulbapediaInfo.nameEN}" class="card-img">
        <ul>
          <li><strong>Card (JP):</strong> ${jpCardInfo.nameJP} ${jpCardInfo.number}</li>
          <li><strong>Card (EN):</strong> ${bulbapediaInfo.nameEN || jpCardInfo.nameEN} ${jpCardInfo.number}</li>
          <li><strong>Logo:</strong> ${jpCardInfo.setCode}</li>
          <li><strong>Set:</strong> ${jpCardInfo.setNameJP} / ${bulbapediaInfo.setNameEN}</li>
          <li><strong>Release Year:</strong> ${jpCardInfo.releaseYear}</li>
          <li><strong>Rarity:</strong> ${jpCardInfo.rarity}</li>
          <li><strong>Illustrator:</strong> ${jpCardInfo.illustrator}</li>
          <li><strong>Condition:</strong> ${jpCardInfo.condition}</li>
          <li><strong>Price Paid (JPY):</strong> ¥${jpCardInfo.pricePaidJPY || '—'}</li>
          <li><strong>eBay Price (USD):</strong> 
            <a href="${priceChartingLink}" target="_blank">Price</a><br>
            <small><a href="${ebaySearchLink}" target="_blank">eBay</a></small>
          </li>
          <li><strong>Buy Again?</strong> ${jpCardInfo.ebayPriceUSD && jpCardInfo.pricePaidJPY && (jpCardInfo.ebayPriceUSD > jpCardInfo.pricePaidJPY / 100 * 1.2) ? 'Yes' : '—'}</li>
        </ul>
      </div>
    `;
  } catch (err) {
    result.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
  }
});

function parseCardInput(input) {
  const match = input.match(/(\d{2,3})\/(\d{2,3})\s*(\w+)?\s*(RR|SR|UR|R|U|C)?/i);
  if (match) {
    const [ , numberStart, numberEnd, setCode, rarity ] = match;
    return {
      number: `${numberStart}/${numberEnd}`,
      setCode: setCode || '',
      rarity: rarity || ''
    };
  }

  const parts = input.split(/\s+/);
  if (parts.length >= 2 && /\d{2,3}\/\d{2,3}/.test(parts[parts.length - 1])) {
    return {
      name: parts.slice(0, -1).join(' '),
      number: parts[parts.length - 1],
      setCode: '',
      rarity: ''
    };
  }

  throw new Error('Please enter a card number and set, or name and number.');
}

async function fetchPokemonCardJP({ number, setCode, rarity }) {
  const searchUrl = `https://www.pokemon-card.com/card-search/details.php/card/${encodeURIComponent(number)}/regu/all`;
  try {
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`);
    const data = await response.json();
    const html = data.contents;

    const nameJPMatch = html.match(/<h1 class="cardname">([^<]+)<\/h1>/);
    const nameJP = nameJPMatch ? nameJPMatch[1].trim() : '—';

    const nameEN = 'Unknown';
    const setNameJP = '—';
    const releaseYear = '—';
    const illustratorMatch = html.match(/<dt>イラストレーター<\/dt>\s*<dd>([^<]+)<\/dd>/);
    const illustrator = illustratorMatch ? illustratorMatch[1].trim() : '—';

    const imageMatch = html.match(/<div class="thumb">\s*<img src="([^"]+)"/);
    const image = imageMatch ? `https://www.pokemon-card.com${imageMatch[1]}` : '';

    return {
      nameJP,
      nameEN,
      number,
      rarity: rarity || '—',
      setCode,
      setNameJP,
      setNameEN: '—',
      releaseYear,
      illustrator,
      condition: 'NM',
      pricePaidJPY: '',
      ebayPriceUSD: '',
      image
    };
  } catch (err) {
    return {
      nameJP: '—',
      nameEN: '—',
      number,
      rarity: rarity || '—',
      setCode,
      setNameJP: '—',
      setNameEN: '—',
      releaseYear: '—',
      illustrator: '—',
      condition: 'NM',
      pricePaidJPY: '',
      ebayPriceUSD: '',
      image: '',
    };
  }
}

async function fetchBulbapediaInfo({ name, number }) {
  if (!name) return { nameEN: '—', setNameEN: '—' };

  try {
    const url = `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(name.replace(/ /g, '_'))}_(${number})`;
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    const html = data.contents;

    const setMatch = html.match(/<th[^>]*>English expansion[^<]*<\/th>\s*<td[^>]*><a[^>]*>([^<]+)<\/a>/);
    const setNameEN = setMatch ? setMatch[1].trim() : '—';

    const nameMatch = html.match(/<title>([^|]+)\|/);
    const nameEN = nameMatch ? nameMatch[1].trim() : name;

    return {
      nameEN,
      setNameEN
    };
  } catch (err) {
    return {
      nameEN: name,
      setNameEN: '—'
    };
  }
}
