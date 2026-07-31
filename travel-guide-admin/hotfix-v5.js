(() => {
  const safeEscape = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value || '');

  function hotelMarkup(data = {}) {
    return `
      <div class="hotelbar"><strong>호텔</strong><button type="button" class="remove">삭제</button></div>
      <div class="hotelgrid hotelgrid-v4">
        <input class="field hotel-day" placeholder="숙박 일차 * (예: 1일차, 2~3일차)" value="${safeEscape(data.day || '')}">
        <input class="field hotel-name" placeholder="호텔명 *" value="${safeEscape(data.name || '')}">
        <input class="field hotel-city" placeholder="도시 *" value="${safeEscape(data.city || '')}">
        <input class="field wide hotel-address" placeholder="주소 또는 지역 (선택)" value="${safeEscape(data.address || '')}">
        <input class="field wide hotel-note" placeholder="조식, 객실, 특이사항 (선택)" value="${safeEscape(data.note || '')}">
      </div>`;
  }

  function upgradeHotels() {
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

  addHotel = function addHotelV5(data = {}) {
    hotelSeq += 1;
    const element = document.createElement('article');
    element.className = 'hotel';
    element.innerHTML = hotelMarkup(data);
    element.querySelector('.remove').onclick = () => {
      element.remove();
      renumberHotels();
    };
    $('hotels').appendChild(element);
    renumberHotels();
  };

  collectHotels = function collectHotelsV5() {
    return [...document.querySelectorAll('.hotel')].map((hotel) => ({
      day: hotel.querySelector('.hotel-day')?.value.trim() || '',
      name: hotel.querySelector('.hotel-name')?.value.trim() || '',
      city: hotel.querySelector('.hotel-city')?.value.trim() || '',
      address: hotel.querySelector('.hotel-address')?.value.trim() || '',
      note: hotel.querySelector('.hotel-note')?.value.trim() || ''
    })).filter((hotel) => hotel.day || hotel.name || hotel.city);
  };

  encodeData = async function encodeDataV5(data) {
    const raw = new TextEncoder().encode(JSON.stringify(data));
    if ('CompressionStream' in window) {
      try {
        const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
        const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
        return `g${bytesToB64url(compressed)}`;
      } catch (error) {
        console.warn('gzip compression failed, using raw payload', error);
      }
    }
    return `n${bytesToB64url(raw)}`;
  };

  function jsonpShorten(host, url, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const callback = `short_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        delete window[callback];
        script.remove();
        error ? reject(error) : resolve({ url: value, provider: host });
      };
      const timer = setTimeout(() => finish(new Error(`${host} 응답 시간 초과`)), timeoutMs);
      window[callback] = (data) => {
        if (data?.shorturl) finish(null, data.shorturl);
        else finish(new Error(data?.errormessage || `${host} 단축 실패`));
      };
      script.onerror = () => finish(new Error(`${host} 연결 차단`));
      script.src = `https://${host}/create.php?format=json&callback=${callback}&url=${encodeURIComponent(url)}`;
      document.head.appendChild(script);
    });
  }

  shortenUrl = async function shortenUrlV5(url) {
    const errors = [];
    for (const host of ['is.gd', 'v.gd']) {
      try {
        return await jsonpShorten(host, url);
      } catch (error) {
        errors.push(error.message);
      }
    }
    throw new Error(errors.join(' / '));
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
      const payload = {
        v: 5,
        cities: cities.map((city) => ({ ...city })),
        scheduleUrl,
        guide,
        hotels,
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
        '고객용 안내 링크가 생성되었습니다. 단축 주소를 만드는 중입니다.',
        `원본 링크 생성 완료 · ${longUrl.length.toLocaleString()}자`
      );
      $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (longUrl.length > 5000) {
        showLink(
          longUrl,
          longUrl,
          '입력 내용이 많아 외부 단축 서비스의 5,000자 제한을 넘었습니다. 원본 링크는 사용할 수 있습니다.',
          '호텔 설명이나 기타 안내사항을 줄이면 단축 URL을 만들 수 있습니다.'
        );
        return;
      }

      button.textContent = '단축 URL 생성 중...';
      try {
        const result = await shortenUrl(longUrl);
        showLink(
          result.url,
          longUrl,
          '단축 URL이 생성되었습니다. 문자나 카카오톡에 붙여 넣어 발송하세요.',
          `${result.provider} 단축 완료 · 고객 미리보기는 원본 링크로 연결됩니다.`
        );
      } catch (error) {
        console.warn('URL shorteners failed', error);
        showLink(
          longUrl,
          longUrl,
          '외부 단축 서비스가 차단되어 원본 링크를 표시합니다. 안내 페이지 자체는 정상 작동합니다.',
          `단축 실패 원인: ${error.message}`
        );
      }
    } catch (error) {
      console.error(error);
      showError(`URL 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
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

  upgradeHotels();
  renumberHotels();
})();