// rita-base\src\constants\CHECK_ITEMS.ts

// -------------------------
// CHECK_ITEMS.ts
// - 各診断項目の定義と表示内容（説明・NG理由・対応アドバイス）を格納
// - page.tsx や ResultCard などから参照される診断ロジックの基礎データ
// -------------------------

export const CHECK_ITEMS = [
  {
    label: 'ip_check',
    displayName: 'ご利用IPアドレス',
    description: 'インターネットへ接続する際のIPを確認',
    keyword: '外部IP',
    tooltip: 'ブラウザまたは当テスト通信から抽出されたIPアドレスです',
    detail: 'インターネットへ接続する際に使用されるグローバルIPを表示します。',
    ngReason: '接続元のIPアドレスが取得できませんでした。Proxy設定や閉域網、特殊なNAT構成などが原因となる場合があります。',
    action: 'IPアドレスの取得が制限されている可能性があります。お使いのネットワーク管理者に「WebRTCを利用した映像通信を行う予定がある」とお伝えの上、構成や制限についてご確認ください。'
  },
  {
    label: 'service_access',
    displayName: 'サービスへの通信確認',
    description: 'キヅクモサービスへの接続（TCP 443）が可能か',
    keyword: 'サービスへの通信確認',
    tooltip: 'alarm.com等へのHTTPS接続確認',
    detail: 'キズクモポータルへの接続確認をします。',
    ngReason: 'キヅクモサービス（インターネット上のサーバ）に接続できませんでした。',
    action: 'ご利用のネットワークでTCP 443ポート（https通信）がブロックされていないかをご確認ください。お使いのネットワーク環境の管理者やご利用ネットワークサービスプロバイダー様への確認をおすすめします。'
  },
  {
    label: 'port_check',
    displayName: '通信ポート確認',
    description: '管理・映像用のTCP/UDPポートが開いているか',
    keyword: 'ポート確認:',
    tooltip: 'TCP/UDPポートの疎通確認',
    detail: '映像配信・制御系に使われる複数ポートの開放状態を確認します。',
    ngReason: 'カメラの映像配信や制御に必要な通信ポートの一部が制限されている可能性があります。',
    action: '使いのネットワーク環境の管理者やご利用ネットワークサービスプロバイダー様へ「キヅクモカメラサービスで利用する特定ポートの通信許可」についてご確認ください。具体的なポート番号は弊社営業までお問い合わせください。'
  },
  {
    label: 'turn_check',
    displayName: 'TURN接続確認',
    description: '中継（relay）でWebRTC接続できるか',
    keyword: '--- フェーズ3：映像通信（WebRTC）確認（relay限定） ---',
    tooltip: 'relay候補での接続ができたか',
    detail: 'TURN中継を用いた接続が成功すればOKです。ご利用のネットワークから弊社キヅクモサーバへのアクセスができたことを意味します。',
    ngReason: 'インターネット経由の中継接続（TURN）ができませんでした。',
    action: '使いのネットワーク環境の管理者やご利用ネットワークサービスプロバイダー様へ「キヅクモカメラサービスで利用する特定ポートの通信許可」についてご確認ください。具体的なポート番号は弊社営業までお問い合わせください。'
  },
  {
    label: 'p2p_check',
    displayName: '【参考】P2P接続確認',
    description: '直接通信（P2P）でWebRTC接続できるか',
    keyword: '--- フェーズ3：映像通信（WebRTC）確認（P2P含む） ---',
    tooltip: 'srflx/host候補による直接通信が可能か',
    detail: '当機能は必須ではありませんが、P2P接続が成功すれば中継を介さずスムーズな映像通信が可能になります。',
    ngReason: 'P2Pによる直接通信が確立できず、中継（TURN）接続にフォールバックしました。ルーターやNAT構成の影響が考えられます。',
    action: 'STUN/TURNによるNAT超えが制限されている可能性があります。ただしP2P接続は必須条件ではないため、通信そのものには問題ありません。通信品質の最適化をご希望の場合はネットワーク構成の見直しをご検討ください。'
  }
];

export type CheckItem = (typeof CHECK_ITEMS)[number];

