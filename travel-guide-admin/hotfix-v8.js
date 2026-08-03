(() => {
  const WORKER_BASE_V8 = 'https://modetour-guide-shortener.ahrvks.workers.dev';

  async function createShortUrlV8(longUrl, expiresAt) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${WORKER_BASE_V8}/api/guides`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: longUrl, expiresAt }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.url) throw new Error(data?.error || `단축 서버 오류 HTTP ${response.status}`);
      return data.url;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('전용 단축 서버 응답 시간이 초과되었습니다.');
      if (error instanceof TypeError) throw new Error('전용 단축 서버에 연결하지 못했습니다.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function showLinkV8(link, preview, description, status) {
    $('generatedLink').value = link;
    $('generatedLink').setAttribute('value', link);
    $('previewLink').href = preview;
    $('resultDesc').textContent = description;
    $('shortStatus').textContent = status;
    $('result').classList.add('show');
  }

  $('generate').onclick = async () => {
    clearError();
    const productName = $('productName').value.trim();
    const scheduleUrl = $('scheduleUrl').value.trim();
    const guide = $('guideInfo').value.trim();
    const hotels = collectHotels();

    if (!cities.length) return showError('여행지를 1개 이상 입력해 주세요.');
    if (!productName) return showError('고객 화면 상단에 표시할 상품명을 입력해 주세요.');
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
      const payload = {
        v: 8,
        productName,
        cities: cities.map((city) => ({ ...city })),
        scheduleUrl,
        guide,
        hotels,
        notes: $('notes').value.trim(),
        createdAt: new Date().toISOString(),
        expiresAt
      };

      const token = await encodeData(payload);
      const customerUrl = new URL('../travel-guide/', location.href);
      customerUrl.searchParams.set('d', token);
      const longUrl = customerUrl.href;

      showLinkV8(longUrl, longUrl, '고객용 안내 페이지를 만들었습니다. 짧은 주소를 발급하고 있습니다.', `원본 링크 생성 완료 · ${longUrl.length.toLocaleString()}자`);
      $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });

      button.textContent = '전용 단축 URL 발급 중...';
      const shortUrl = await createShortUrlV8(longUrl, expiresAt);
      showLinkV8(shortUrl, longUrl, '단축 URL이 생성되었습니다. 문자나 카카오톡으로 발송하세요.', 'Cloudflare 전용 단축 서버 발급 완료 · 설정한 만료일 이후 자동 종료됩니다.');
    } catch (error) {
      console.error(error);
      const message = error?.message || '알 수 없는 오류';
      if ($('generatedLink').value) {
        showLinkV8($('generatedLink').value, $('previewLink').href || $('generatedLink').value, '고객용 원본 링크는 생성됐지만 단축 URL 발급에 실패했습니다.', `단축 서버 오류: ${message}`);
      } else {
        showError(`URL 생성 중 오류가 발생했습니다: ${message}`);
      }
    } finally {
      button.disabled = false;
      button.textContent = '고객 안내 단축 URL 생성하기';
    }
  };

  const previousSample = $('fillSample').onclick;
  $('fillSample').onclick = () => {
    if (typeof previousSample === 'function') previousSample();
    $('productName').value = '남미 핵심 3개국 리우데자네이루·페루·칸쿤 10일';
  };
})();