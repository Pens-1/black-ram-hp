/**
 * BLACK RAM HP 更新用シートの Apps Script（拡張機能 → Apps Script に貼り付ける。手順は docs/sheet-update.md）
 *
 * - シートを開くとメニュー「サイト」→「サイトに反映」が出る
 * - 押すと、スクリプトプロパティ DEPLOY_HOOK_URL（Cloudflare Pages の deploy hook）に POST して作り直す
 * - 5分以内の連打は無視して「さっき反映しました」と出す
 * - setupDailyTrigger を1回実行すると、毎日1回（0時台）自動で反映する（日付が過ぎたライブを切り替えるため）
 *
 * @OnlyCurrentDoc
 * （↑この行が、権限を「このシートだけ」に絞る。消さない。消すとアカウントの全スプレッドシートに触れる権限を求める）
 */

var MENU_NAME = 'サイト';
var COOLDOWN_MS = 5 * 60 * 1000;
var LAST_KEY = 'LAST_DEPLOY_AT';

function onOpen() {
  SpreadsheetApp.getUi().createMenu(MENU_NAME).addItem('サイトに反映', 'deploySite').addToUi();
}

/** メニュー「サイトに反映」 */
function deploySite() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    ss.toast('さっき反映しました。少し待ってからもう一度どうぞ', MENU_NAME, 5);
    return;
  }
  try {
    var last = Number(props.getProperty(LAST_KEY) || 0);
    if (Date.now() - last < COOLDOWN_MS) {
      ss.toast('さっき反映しました（数分でサイトに出ます）', MENU_NAME, 5);
      return;
    }
    var result = callDeployHook_();
    if (result.ok) {
      props.setProperty(LAST_KEY, String(Date.now()));
      ss.toast('反映を始めました。数分でサイトに出ます', MENU_NAME, 8);
    } else {
      ss.toast('反映できませんでした: ' + result.message, MENU_NAME, 15);
    }
  } finally {
    lock.releaseLock();
  }
}

/** 毎日の自動反映（時間トリガーから呼ばれる。画面がないのでトーストは出さない） */
function dailyDeploy() {
  var result = callDeployHook_();
  if (result.ok) PropertiesService.getScriptProperties().setProperty(LAST_KEY, String(Date.now()));
  else throw new Error('自動反映に失敗: ' + result.message); // 失敗はトリガーのエラー通知メールで分かる
}

/** 毎日1回（0時台）の時間トリガーを作る。何回実行しても1つだけになる */
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyDeploy') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyDeploy').timeBased().everyDays(1).atHour(0).inTimezone('Asia/Tokyo').create();
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('毎日の自動反映を設定しました', MENU_NAME, 5);
  } catch (e) {
    // エディタから実行したときはトーストを出せなくてよい
  }
}

function callDeployHook_() {
  var url = PropertiesService.getScriptProperties().getProperty('DEPLOY_HOOK_URL');
  if (!url) return { ok: false, message: 'スクリプトプロパティ DEPLOY_HOOK_URL が未設定' };
  try {
    var res = UrlFetchApp.fetch(url, { method: 'post', muteHttpExceptions: true });
    var code = res.getResponseCode();
    if (code >= 200 && code < 300) return { ok: true, message: '' };
    return { ok: false, message: 'HTTP ' + code };
  } catch (e) {
    return { ok: false, message: String(e && e.message ? e.message : e) };
  }
}
