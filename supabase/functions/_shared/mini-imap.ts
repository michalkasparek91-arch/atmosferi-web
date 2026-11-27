// Minimal read-only IMAP client on Deno's native TLS socket.
// Written because imapflow (Node streams under Deno) hangs while downloading message bodies.
// Supports just what sync-inbox needs: LOGIN, EXAMINE, UID SEARCH, UID FETCH, LOGOUT.

export type Untagged = { line: string; literals: Uint8Array[] };

const enc = new TextEncoder();
const latin1 = new TextDecoder("latin1");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export class MiniImap {
  private conn!: Deno.Conn;
  private buf = new Uint8Array(0);
  private seq = 0;
  private closed = false;

  constructor(private timeoutMs = 30_000) {}

  async connect(host: string, port = 993, tls = true) {
    this.conn = tls ? await Deno.connectTls({ hostname: host, port }) : await Deno.connect({ hostname: host, port });
    const greeting = latin1.decode(await this.readLine());
    if (!/^\* (OK|PREAUTH)/i.test(greeting)) throw new Error("IMAP server refused the connection: " + greeting.slice(0, 120));
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try { this.conn.close(); } catch { /* already closed */ }
  }

  // ---- low level -------------------------------------------------------------
  private async fill() {
    const chunk = new Uint8Array(64 * 1024);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const n = await Promise.race([
      this.conn.read(chunk),
      new Promise<null>((_, rej) => { timer = setTimeout(() => { this.close(); rej(new Error("IMAP timeout")); }, this.timeoutMs); }),
    ]).finally(() => clearTimeout(timer));
    if (n === null) throw new Error("IMAP connection closed");
    const next = new Uint8Array(this.buf.length + n);
    next.set(this.buf); next.set(chunk.subarray(0, n), this.buf.length);
    this.buf = next;
  }

  private async readLine(): Promise<Uint8Array> {
    for (;;) {
      for (let i = 0; i + 1 < this.buf.length; i++) {
        if (this.buf[i] === 13 && this.buf[i + 1] === 10) {
          const line = this.buf.slice(0, i);
          this.buf = this.buf.slice(i + 2);
          return line;
        }
      }
      await this.fill();
    }
  }

  private async readExact(len: number): Promise<Uint8Array> {
    while (this.buf.length < len) await this.fill();
    const out = this.buf.slice(0, len);
    this.buf = this.buf.slice(len);
    return out;
  }

  /** Sends one command and collects untagged responses (with their literals) until the tagged reply. */
  async command(cmd: string): Promise<{ ok: boolean; status: string; untagged: Untagged[] }> {
    const tag = "A" + (++this.seq);
    await this.conn.write(enc.encode(`${tag} ${cmd}\r\n`));
    const untagged: Untagged[] = [];
    for (;;) {
      let line = latin1.decode(await this.readLine());
      const literals: Uint8Array[] = [];
      let m: RegExpMatchArray | null;
      while ((m = line.match(/\{(\d+)\}$/))) {
        literals.push(await this.readExact(Number(m[1])));
        line = line.slice(0, -m[0].length) + "\u0000" + latin1.decode(await this.readLine());
      }
      if (line.startsWith(tag + " ")) {
        return { ok: /^\S+ OK/i.test(line), status: line.slice(tag.length + 1), untagged };
      }
      if (line.startsWith("+")) continue; // continuation request (not used)
      untagged.push({ line, literals });
    }
  }

  private static quote(s: string) {
    return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }

  // ---- high level ------------------------------------------------------------
  async login(user: string, pass: string) {
    const r = await this.command(`LOGIN ${MiniImap.quote(user)} ${MiniImap.quote(pass)}`);
    if (!r.ok) throw new Error("IMAP login failed: " + r.status.slice(0, 120));
  }

  /** Opens the mailbox read-only; returns UIDVALIDITY. */
  async examine(mailbox = "INBOX"): Promise<number> {
    const r = await this.command(`EXAMINE ${MiniImap.quote(mailbox)}`);
    if (!r.ok) throw new Error("IMAP EXAMINE failed: " + r.status.slice(0, 120));
    for (const u of [...r.untagged.map(x => x.line), r.status]) {
      const m = u.match(/UIDVALIDITY (\d+)/i);
      if (m) return Number(m[1]);
    }
    return 0;
  }

  async searchUids(criteria: string): Promise<number[]> {
    const r = await this.command(`UID SEARCH ${criteria}`);
    if (!r.ok) throw new Error("IMAP SEARCH failed: " + r.status.slice(0, 120));
    const out: number[] = [];
    for (const u of r.untagged) {
      const m = u.line.match(/^\* SEARCH\s*(.*)$/i);
      if (m) for (const n of m[1].trim().split(/\s+/)) if (/^\d+$/.test(n)) out.push(Number(n));
    }
    return out.sort((a, b) => a - b);
  }

  static since(date: Date) {
    return `${date.getUTCDate()}-${MONTHS[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
  }

  /** UID FETCH with one body item; returns uid -> literal bytes. */
  async fetchBodies(uids: number[], item: string): Promise<Map<number, Uint8Array>> {
    const out = new Map<number, Uint8Array>();
    if (!uids.length) return out;
    const r = await this.command(`UID FETCH ${uids.join(",")} (UID ${item})`);
    if (!r.ok) throw new Error("IMAP FETCH failed: " + r.status.slice(0, 120));
    for (const u of r.untagged) {
      const m = u.line.match(/UID (\d+)/i);
      if (m && u.literals.length) out.set(Number(m[1]), u.literals[u.literals.length - 1]);
    }
    return out;
  }

  async logout() {
    try { await this.command("LOGOUT"); } catch { /* ignore */ }
    this.close();
  }
}
