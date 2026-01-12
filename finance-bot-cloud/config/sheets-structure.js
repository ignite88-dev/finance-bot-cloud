export const SHEETS_STRUCTURE = {
  // Super Admin Sheet Structure
  SUPER_ADMIN: {
    sheetId: null, // Will be set from env
    sheets: {
      GROUPS: {
        name: 'Groups',
        headers: [
          'Chat ID',
          'Group Name',
          'Owner User ID',
          'Owner Username',
          'Sheet ID',
          'Sheet URL',
          'Created At',
          'Last Activity',
          'Status',
          'Wallet IDR',
          'Wallet USD',
          'Total Transactions',
          'Active Users',
          'Daily Limit',
          'Monthly Limit',
          'Timezone',
          'Currency',
          'Enable Chat',
          'Require Admin Approval',
          'Big Transaction Threshold'
        ],
        range: 'A:T'
      },
      ERROR_LOGS: {
        name: 'Error Logs',
        headers: [
          'Timestamp',
          'Chat ID',
          'Group Name',
          'Error Type',
          'Error Message',
          'Stack Trace',
          'User ID',
          'Username',
          'Action',
          'Resolved',
          'Resolution Notes'
        ],
        range: 'A:K'
      },
      AUDIT_LOGS: {
        name: 'Audit Logs',
        headers: [
          'Timestamp',
          'Chat ID',
          'Group Name',
          'User ID',
          'Username',
          'Action',
          'Entity Type',
          'Entity ID',
          'Old Value',
          'New Value',
          'IP Address',
          'User Agent'
        ],
        range: 'A:L'
      },
      PERFORMANCE: {
        name: 'Performance',
        headers: [
          'Timestamp',
          'Endpoint',
          'Response Time',
          'Memory Usage',
          'CPU Usage',
          'Active Connections',
          'Request Count',
          'Error Count',
          'Cache Hit Rate',
          'Sheets API Calls'
        ],
        range: 'A:J'
      }
    }
  },
  
  // Group Sheet Structure
  GROUP: {
    sheets: {
      SETTINGS: {
        name: 'Settings',
        headers: [
          'Key',
          'Value',
          'Last Updated',
          'Updated By'
        ],
        defaultData: [
          ['group_name', '', '', ''],
          ['owner_user_id', '', '', ''],
          ['owner_username', '', '', ''],
          ['daily_limit', '20', '', ''],
          ['monthly_limit', '1000', '', ''],
          ['timezone', 'Asia/Jakarta', '', ''],
          ['currency', 'IDR', '', ''],
          ['enable_chat', 'true', '', ''],
          ['require_admin_approval', 'true', '', ''],
          ['big_transaction_threshold', '1000000', '', ''],
          ['notify_on_limit', 'true', '', ''],
          ['auto_reset_daily', 'true', '', ''],
          ['exchange_rate', '15000', '', ''],
          ['created_at', '', '', ''],
          ['last_reset_daily', '', '', ''],
          ['last_reset_monthly', '', '', '']
        ]
      },
      
      USERS: {
        name: 'Users',
        headers: [
          'User ID',
          'Username',
          'First Name',
          'Last Name',
          'Role',
          'Joined At',
          'Last Active',
          'Total Transactions',
          'Total Amount IDR',
          'Total Amount USD',
          'Is Admin',
          'Permissions'
        ]
      },
      
      WALLET: {
        name: 'Wallet',
        headers: [
          'Currency',
          'Balance',
          'Last Updated',
          'Updated By'
        ],
        defaultData: [
          ['IDR', '0', '', ''],
          ['USD', '0', '', '']
        ]
      },
      
      TRANSACTIONS: {
        name: 'Transactions',
        headers: [
          'Transaction ID',
          'Timestamp',
          'User ID',
          'Username',
          'Type',
          'Amount',
          'Currency',
          'Target Currency',
          'Target Amount',
          'Exchange Rate',
          'Description',
          'Category',
          'Counts To Daily Limit',
          'Canceled',
          'Canceled At',
          'Canceled By',
          'Requires Admin Approval',
          'Approved By',
          'Approved At',
          'Tags',
          'Notes'
        ]
      },
      
      AI_MEMORY: {
        name: 'AI_Memory',
        headers: [
          'Memory ID',
          'Timestamp',
          'User ID',
          'Username',
          'Message',
          'AI Response',
          'Intent',
          'Entities',
          'Context Hash',
          'Thread ID',
          'Message Type',
          'Tokens Used',
          'Model',
          'Sentiment',
          'Confidence'
        ]
      },
      
      DAILY_LIMITS: {
        name: 'Daily_Limits',
        headers: [
          'Date',
          'Daily Spent USD',
          'Daily Limit',
          'Warnings',
          'Reset Time',
          'Last Transaction'
        ]
      },
      
      MONTHLY_LIMITS: {
        name: 'Monthly_Limits',
        headers: [
          'Month',
          'Monthly Spent USD',
          'Monthly Limit',
          'Categories JSON',
          'Last Updated'
        ]
      },
      
      ERROR_LOGS: {
        name: 'Error_Logs',
        headers: [
          'Timestamp',
          'Error Type',
          'Error Message',
          'Stack Trace',
          'User ID',
          'Username',
          'Action',
          'Resolved',
          'Resolution Notes'
        ]
      }
    }
  },
  
  // Sheet creation configuration
  CREATION_CONFIG: {
    properties: {
      title: 'Finance Bot Group Data',
      locale: 'id_ID',
      timeZone: 'Asia/Jakarta',
      autoRecalc: 'ON_CHANGE'
    },
    sheets: [
      {
        properties: {
          title: 'Settings',
          gridProperties: {
            rowCount: 100,
            columnCount: 4,
            frozenRowCount: 1
          }
        }
      },
      {
        properties: {
          title: 'Users',
          gridProperties: {
            rowCount: 1000,
            columnCount: 12,
            frozenRowCount: 1
          }
        }
      },
      {
        properties: {
          title: 'Wallet',
          gridProperties: {
            rowCount: 10,
            columnCount: 4,
            frozenRowCount: 1
          }
        }
      },
      {
        properties: {
          title: 'Transactions',
          gridProperties: {
            rowCount: 10000,
            columnCount: 21,
            frozenRowCount: 1
          }
        }
      },
      {
        properties: {
          title: 'AI_Memory',
          gridProperties: {
            rowCount: 10000,
            columnCount: 15,
            frozenRowCount: 1
          }
        }
      },
      {
        properties: {
          title: 'Daily_Limits',
          gridProperties: {
            rowCount: 365,
            columnCount: 6,
            frozenRowCount: 1
          }
        }
      },
      {
        properties: {
          title: 'Monthly_Limits',
          gridProperties: {
            rowCount: 120,
            columnCount: 5,
            frozenRowCount: 1
          }
        }
      },
      {
        properties: {
          title: 'Error_Logs',
          gridProperties: {
            rowCount: 1000,
            columnCount: 9,
            frozenRowCount: 1
          }
        }
      }
    ]
  }
};