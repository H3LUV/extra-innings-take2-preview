(() => {
  const originalEscape = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value || '');

  function hotelFields(data = {}) {
    return `
      <div class="hotelbar"><strong>호텔</strong><button type="button" class="remove">삭제</button></div>
      <div class="hotelgrid hotelgrid-v4">
        <input class="field hotel-day" placeholder="숙박 일차 * (예: 1일차, 2~3일차)" value="${originalEscape(data.day || '')}">
        <input class="field hotel-name" placeholder="호텔명 *" value="${originalEscape(data.name || '')}">
        <input class="field hotel-city" placeholder="도시 *" value="${originalEscape(data.city || '')}">
        <input class="field wide hotel-address" placeholder="주소 또는 지역 (선택)" value="${originalEscape(data.address || '')}">
        <input class="field wide hotel-note" placeholder="조식, 객실, 특이사항 (선택)" value="${originalEscape(data.note || '')}">
      </div>`;
  }

  function upgradeExistingHotels() {
    document.querySelectorAll('.hotel').forEach((hotel) => {
      if (hotel.querySelector('.hotel-day')) return;
      const grid = hotel.querySelector('.hotelgrid');
      if (!grid) return;
      grid.classList.add('hotelgrid-v4');
      const day = document.createElement('input');
      day.className = 'field hotel-day';
      day.placeholder = '숙박 일차 * (예: 1일차, 2~3일차)';
      grid.insertBefore(day, grid.firstChild);
    });
  }

  addHotel = function addHotelV4(data = {}) {
    hotelSeq += 1;
    const element = document.createElement('article');
    element.className = 'hotel';
    element.innerHTML = hotelFields(data);
    element.querySelector('.remove').onclick = () => {
      element.remove();
      renumberHotels();
    };
    $('hotels').appendChild(element);
    renumberHotels();
  };

  collectHotels = function collectHotelsV4() {
    return [...document.querySelectorAll('.hotel')].map((hotel) => ({
      day: hotel.querySelector('.hotel-day')?.value.trim() || '',
      name: hotel.querySelector('.hotel-name')?.value.trim() || '',
      city: hotel.querySelector('.hotel-city')?.value.trim() || '',
      address: hotel.querySelector('.hotel-address')?.value.trim() || '',
      note: hotel.querySelector('.hotel-note')?.value.trim() || ''
    })).filter((hotel) => hotel.day || hotel.name || hotel.city);
  };

  encodeData = async function encodeDataV4(data) {
    const raw = new TextEncoder().encode(JSON.stringify(data));
    return `n${bytesToB64url(raw)}`;
  };

  shortenUrl = function shortenUrlV4(url) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const callback = `isgd_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        delete window[callback];
        script.remove();
        error ? reject(error) : resolve(value);
      };
      const timer = setTimeout(() => finish(new Error('timeout')), 6000);
      window[callback] = (data) => data?.shorturl
        ? finish(null, data.shorturl)
        : finish(new Error(data?.errormessage || 'shorten failed'));
      script.onerror = () => finish(new Error('network'));
      script.src = `https://is.gd/create.php?format=json&callback=${callback}&url=${encodeURIComponent(url)}`;
      document.head.appendChild(script);
    });
  };

  function showLink(link, preview, description, status) {
    $('generatedLink').value = link;
    $('generatedLink').setAttribute('value', link);
    $('previewLink').href = preview;
    $('resultDesc').textContent = description;
    $('shortStatus').textContent = status;
    $('result').classList.add('show');
  }

  $('generate').onclick = async () => {
    clearError();
    const scheduleUrl = $('scheduleUrl').value.trim();
    const guide = $('guideInfo').value.trim();
    const hotels = collectHotels();
    if (!cities.length) return showError('여행지를 1개 이상 입력해 주세요.');
    if (!validUrl(scheduleUrl)) return showError('확정 일정 URL을 http 또는 https 주소로 입력해 주세요.');
    if (!guide) return showError('가이드 정보를 입력해 주세요.');
    if (!hotels.length || hotels.some((hotel) => !hotel.day || !hotel.name || !hotel.city)) {
      return showError('각 확정 호텔의 숙박 일차, 호텔명, 도시를 모두 입력해 주세요.');
    }

    const button = $('generate');
    button.disabled = true;
    button.textContent = '안내 링크 생성 중...';
    $('result').classList.remove('show');

    try {
      const customerHotels = hotels.map((hotel) => ({
        ...hotel,
        name: `${hotel.day} · ${hotel.name}`
      }));
      const payload = {
        v: 4,
        cities: cities.map((city) => ({ ...city })),
        scheduleUrl,
        guide,
        hotels: customerHotels,
        notes: $('notes').value.trim(),
        createdAt: new Date().toISOString(),
        expiresAt: futureDate(Number($('expiryMonths').value))
      };
      const token = await encodeData(payload);
      const customerUrl = new URL('../travel-guide/', location.href);
      customerUrl.searchParams.set('d', token);
      const longUrl = customerUrl.href;

      showLink(
        longUrl,
        longUrl,
        '안내 링크가 생성되었습니다. 단축 주소를 만드는 중이며 원본 링크는 지금 바로 사용할 수 있습니다.',
        '원본 링크 생성 완료 · 단축 URL 변환 중'
      );
      $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });

      button.textContent = '단축 URL 생성 중...';
      try {
        const shortUrl = await shortenUrl(longUrl);
        showLink(
          shortUrl,
          longUrl,
          '단축 URL이 생성되었습니다. 문자나 카카오톡에 붙여 넣어 발송하세요.',
          '단축 주소는 is.gd에서 생성되며 안내 내용은 설정한 만료일 이후 가려집니다.'
        );
      } catch (_) {
        showLink(
          longUrl,
          longUrl,
          '단축 서비스 연결에 실패해 원본 링크를 표시합니다. 링크 자체는 정상적으로 사용할 수 있습니다.',
          '잠시 뒤 다시 생성하면 단축 주소가 발급될 수 있습니다.'
        );
      }
    } catch (error) {
      console.error(error);
      showError('URL 생성 중 오류가 발생했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      button.disabled = false;
      button.textContent = '고객 안내 단축 URL 생성하기';
    }
  };

  $('fillSample').onclick = () => {
    cities.splice(0, cities.length,
      { label: '취리히', name: 'Zürich', country: '스위스', country_code: 'CH', latitude: 47.3769, longitude: 8.5417, admin1: '취리히' },
      { label: '루체른', name: 'Lucerne', country: '스위스', country_code: 'CH', latitude: 47.0502, longitude: 8.3093, admin1: '루체른' },
      { label: '프라하', name: 'Prague', country: '체코', country_code: 'CZ', latitude: 50.0755, longitude: 14.4378, admin1: '프라하' }
    );
    renderCities();
    notesEdited = false;
    autoNotes(true);
    $('scheduleUrl').value = 'https://www.modetour.com/';
    $('guideInfo').value = '인솔자 김모두\n현지 연락처: +41-00-000-0000\n카카오톡 ID: modetour-guide\n비상 상황 발생 시 위 연락처로 연락해 주세요.';
    $('hotels').innerHTML = '';
    addHotel({ day: '1~2일차', name: 'Hotel Schweizerhof Zürich', city: '취리히', address: 'Bahnhofplatz 7, Zürich', note: '조식 포함 · 중앙역 인근' });
    addHotel({ day: '3~4일차', name: 'Grand Hotel Prague Towers', city: '프라하', address: 'Kongresová 1, Prague', note: '무료 Wi-Fi' });
  };

  upgradeExistingHotels();
  renumberHotels();
})();