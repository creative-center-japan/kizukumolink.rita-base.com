// rita-base\src\constants\CHECK_ITEMS.ts

// -------------------------
// CHECK_ITEMS.ts
// - 各診断項目の定義と表示内容（説明・NG理由・対応アドバイス）を格納
// - page.tsx や ResultCard などから参照される診断ロジックの基礎データ
// -------------------------

export const CHECK_ITEMS = [
  {
    label: 'ご利用IPアドレス',
    description: 'インターネットへ接続する際のIPを確認',
    keyword: '外部IP',
    tooltip: 'ブラウザまたは当テスト通信から抽出されたIPアドレスです',
    detail: 'インターネットへ接続する際に使用されるグローバルIPを表示します。',
    ngReason: 'グローバルIPが取得できませんでした。',
    action: 'ネットワーク管理者にグローバルIP取得の可否を確認してください。'
  },
  {
    label: 'サービスへの通信確認',
    description: 'キヅクモサービスへの接続（TCP 443）が可能か',
    keyword: 'サービスへの通信確認',
    tooltip: 'alarm.com等へのHTTPS接続確認',
    detail: 'WebSocket接続の前提となるHTTPS接続の可否を確認します。',
    ngReason: 'TCP 443番ポートへの通信ができません。',
    action: 'FWで443ポートを許可してください。'
  },
  {
    label: '通信ポート確認',
    description: '管理・映像用のTCP/UDPポートが開いているか',
    keyword: 'ポート確認:',
    tooltip: 'TCP/UDPポートの疎通確認',
    detail: '映像配信・制御系に使われる複数ポートの開放状態を確認します。',
    ngReason: '一部ポートが閉じています。',
    action: 'ネットワーク管理者にポート制限の確認を依頼してください。'
  },
  {
    label: 'TURN接続確認',
    description: '中継（relay）でWebRTC接続できるか',
    keyword: '--- フェーズ3：映像通信（WebRTC）確認（relay限定） ---',
    tooltip: 'relay候補での接続ができたか',
    detail: 'TURN中継を用いた接続が成功すればOKです。FW越えの手段になります。',
    ngReason: 'relay候補での接続ができませんでした。',
    action: 'FWでUDP/TCP TURN用ポートが開いているか確認してください。'
  },
  {
    label: 'P2P接続確認',
    description: '直接通信（P2P）でWebRTC接続できるか',
    keyword: '--- フェーズ3：映像通信（WebRTC）確認（P2P含む） ---',
    tooltip: 'srflx/host候補による直接通信が可能か',
    detail: 'P2Pが成功すればTURNを介さずスムーズな通信が可能です。',
    ngReason: '直接通信が成立せず、TURNにフォールバックしました。',
    action: 'STUN/TURNの制限や、NAT越え不可の可能性があります。'
  }
];

export type CheckItem = (typeof CHECK_ITEMS)[number];
