document.getElementById("spreadBtn").addEventListener("click", async () => {
  const projectId = document.getElementById("projectId").value.trim();
  const startRaw = document.getElementById("startIndex").value.trim();
  const endRaw = document.getElementById("endIndex").value.trim();
  const statusDiv = document.getElementById("status");

  if (!projectId || !startRaw || !endRaw) {
    statusDiv.textContent = "⚠️ 全ての項目を入力してください";
    return;
  }

  const startIndex = parseInt(startRaw, 10) - 1;
  let endIndex;

  if (endRaw === "*") {
    endIndex = null; // 後で決定
  } else {
    const endParsed = parseInt(endRaw, 10);
    if (isNaN(endParsed) || endParsed < startIndex + 1) {
      statusDiv.textContent = "⚠️ 終了番号が正しくありません";
      return;
    }
    endIndex = endParsed - 1;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [projectId, startIndex, endIndex],
    func: async (projectId, startIndex, endIndex) => {
      const studioElements = document.querySelectorAll(".thumbnail.gallery");
      const studioIds = [];
      studioElements.forEach(el => {
        const link = el.querySelector("a.thumbnail-image");
        if (link) {
          const href = link.getAttribute("href");
          const idMatch = href.match(/\/studios\/(\d+)\//);
          if (idMatch) {
            studioIds.push(idMatch[1]);
          }
        }
      });

      if (studioIds.length === 0) {
        alert("⚠️ スタジオが見つかりませんでした");
        return;
      }

      if (endIndex === null) {
        endIndex = studioIds.length - 1;
      }

      const token = (await (await fetch("/session", {
        headers: { "x-requested-with": "XMLHttpRequest" }
      })).json()).user.token;

      const addToStudio = async (studioId, token) => {
        try {
          const res = await fetch(`https://api.scratch.mit.edu/studios/${studioId}/project/${projectId}`, {
            method: "POST",
            headers: {
              "x-token": token,
              "x-requested-with": "XMLHttpRequest"
            }
          });
          return res.status === 200;
        } catch (error) {
          return false;
        }
      };

      const targetIds = studioIds.slice(startIndex, endIndex + 1);
      const targetElements = Array.from(studioElements).slice(startIndex, endIndex + 1);

      let successCount = 0;
      for (let i = 0; i < targetIds.length; i++) {
        const id = targetIds[i];
        const el = targetElements[i];

        el.style.border = "3px solid red";
        el.style.borderRadius = "8px";

        const success = await addToStudio(id, token);

        if (success) {
          el.style.border = "3px solid green";
          successCount++;
        } else {
          el.style.border = "3px solid gray";
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const failCount = targetIds.length - successCount;
      alert(`🎉 拡散完了！\n成功: ${successCount} 件\n失敗: ${failCount} 件`);
    }
  });
});
