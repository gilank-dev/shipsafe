export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: {
        code: 'method_not_allowed',
        message: 'Method Not Allowed'
      }
    });
  }

  const repoUrl = req.body?.repoUrl;
  if (!repoUrl || typeof repoUrl !== 'string') {
    return res.status(400).json({
      error: {
        code: 'invalid_repo_url',
        message: 'Mohon masukkan URL GitHub atau format owner/repo yang valid.'
      }
    });
  }

  const trimmed = repoUrl.trim();
  const match = trimmed.match(/^(?:https?:\/\/(?:www\.)?github\.com\/|git@github\.com:)?([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git|\/)?$/i);
  if (!match) {
    return res.status(400).json({
      error: {
        code: 'invalid_repo_url',
        message: 'Format URL GitHub tidak valid. Contoh yang didukung: "owner/repo" atau "https://github.com/owner/repo".'
      }
    });
  }

  const owner = match[1];
  const repo = match[2];

  if (!owner || !repo || owner === '.' || owner === '..' || repo === '.' || repo === '..') {
    return res.status(400).json({
      error: {
        code: 'invalid_repo_url',
        message: 'Path repositori tidak valid.'
      }
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const ghRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zipball`, {
      headers: {
        'User-Agent': 'ShipSafe-Importer/1.0',
        Accept: 'application/vnd.github.v3+json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (ghRes.status === 404) {
      return res.status(404).json({
        error: {
          code: 'repo_not_found',
          message: `Repository "${owner}/${repo}" tidak ditemukan atau bersifat privat.`
        }
      });
    }

    if (ghRes.status === 403) {
      return res.status(429).json({
        error: {
          code: 'rate_limited',
          message: 'Batas permintaan GitHub API publik tercapai. Silakan coba beberapa saat lagi atau unggah berkas ZIP secara manual.'
        }
      });
    }

    if (!ghRes.ok) {
      return res.status(ghRes.status >= 500 ? 502 : 400).json({
        error: {
          code: 'github_error',
          message: `Gagal mengunduh repositori GitHub (${ghRes.status} ${ghRes.statusText}).`
        }
      });
    }

    const arrayBuffer = await ghRes.arrayBuffer();
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      return res.status(413).json({
        error: {
          code: 'too_large',
          message: `Ukuran repositori (${Math.round(arrayBuffer.byteLength / 1024 / 1024)} MB) melebihi batas 10 MB.`
        }
      });
    }

    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${owner}-${repo}.zip"`);
    res.setHeader('X-File-Name', `${owner}-${repo}.zip`);
    res.setHeader('X-Repo-Owner', owner);
    res.setHeader('X-Repo-Name', repo);
    res.setHeader('X-Repo-Size', buffer.length.toString());
    return res.send(buffer);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: {
          code: 'fetch_timeout',
          message: 'Waktu pengunduhan repositori dari GitHub melebihi batas waktu (timeout).'
        }
      });
    }

    return res.status(500).json({
      error: {
        code: 'import_failed',
        message: err instanceof Error ? err.message : 'Gagal mengimpor repositori GitHub.'
      }
    });
  }
}
