(() => {
  const WORKER_BASE = 'https://modetour-guide-shortener.ahrvks.workers.dev';
  const safeEscape = typeof escapeHtml === 'function'
    ? escapeHtml
    : (value) => String(value || '');

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

  addHotel = function addHotelV6(data = {}) {
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

  collectHotels = function collectHotelsV6() {
    return [...document.querySelectorAll('.hotel')].map((hotel) => ({
      day: hotel.querySelector('.hotel-day')?.value.trim() || '',
      name: hotel.querySelector('.hotel-name')?.value.trim() || '',
      city: hotel.querySelector('.hotel-city')?.value.trim() || '',
      address: hotel.querySelector('.hotel-address')?.value.trim() || '',
      note: hotel.querySelector('.hotel-note')?.value.trim() || ''
    })).filter((hotel) => hotel.day || hotel.name || hotel.city);
  };

  encodeData = async function encodeDataV6(data) {
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

  function showLink(link, preview, description, status) {
    $('generatedLink').value = link;
    $('generatedLink').setAttribute('value', link);
    $('previewLink').href = preview;
    $('resultDesc').textContent = description;
    $('shortStatus').textContent = status;
    $('result').classList.add('show');
  }

  async function createShortUrl(longUrl, expiresAt) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${WORKER_BASE}/api/guides`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          url: longUrl,
          expiresAt
        }),
        signal: controller.signal
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        throw new Error(`단축 서버 응답을 읽지 못했습니다. HTTP ${response.status}`);
      }

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || `단축 서버 오류가 발생했습니다. HTTP ${response.status}`);
      }

      return data.url;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('전용 단축 서버 응답 시간이 초과되었습니다.');
      }
      if (error instanceof TypeError) {
        throw new Error('전용 단축 서버에 연결하지 못했습니다. Worker 배포와 CORS 설정을 확인해 주세요.');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
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
      const expiresAt = futureDate(Number($('expiryMonths').value));
      const customerHotels = hotels.map((hotel) => ({
        ...hotel,
        name: `${hotel.day} · ${hotel.name}`
      }));

      const payload = {
        v: 6,
        cities: cities.map((city) => ({ ...city })),
        scheduleUrl,
        guide,
        hotels: customerHotels,
        notes: $('notes').value.trim(),
        createdAt: new Date().toISOString(),
        expiresAt
      };

      const token = await encodeData(payload);
      const customerUrl = new URL('../travel-guide/', location.href);
      customerUrl.searchParams.set('d', token);
      const longUrl = customerUrl.href;

      showLink(
        longUrl,
        longUrl,
        '고객용 안내 페이지를 만들었습니다. 전용 단축 서버에서 짧은 주소를 발급하고 있습니다.',
        `원본 링크 생성 완료 · ${longUrl.length.toLocaleString()}자`
      );
      $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });

      button.textContent = '전용 단축 URL 발급 중...';
      const shortUrl = await createShortUrl(longUrl, expiresAt);

      showLink(
        shortUrl,
        longUrl,
        '전용 단축 URL이 생성되었습니다. 문자나 카카오톡에 붙여 넣어 발송하세요.',
        'Cloudflare 전용 단축 서버 발급 완료 · 설정한 만료일 이후 자동 종료됩니다.'
      );
    } catch (error) {
      console.error(error);
      const message = error?.message || '알 수 없는 오류';
      if ($('generatedLink').value) {
        showLink(
          $('generatedLink').value,
          $('previewLink').href || $('generatedLink').value,
          '고객용 원본 링크는 생성됐지만 전용 단축 URL 발급에 실패했습니다.',
          `단축 서버 오류: ${message}`
        );
      } else {
        showError(`URL 생성 중 오류가 발생했습니다: ${message}`);
      }
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