MOCK_TICKETS = [
    {
        "id": "TCK-1001",
        "title": "VPN connection fails after password reset",
        "description": "The user cannot connect to the corporate VPN after changing their password.",
        "category": "Network",
        "priority": "High",
        "resolution": "Reset VPN profile and synchronized identity provider credentials.",
        "closing_comment": "VPN access restored after credential sync.",
    },
    {
        "id": "TCK-1002",
        "title": "Outlook mailbox not receiving emails",
        "description": "Incoming emails are delayed and mailbox storage is close to the quota limit.",
        "category": "Email",
        "priority": "Medium",
        "resolution": "Archived old emails and increased mailbox quota.",
        "closing_comment": "Mail flow returned to normal.",
    },
    {
        "id": "TCK-1003",
        "title": "Laptop performance is very slow",
        "description": "User reports long startup time and high CPU usage during normal office work.",
        "category": "Hardware",
        "priority": "Low",
        "resolution": "Removed unnecessary startup applications and updated device drivers.",
        "closing_comment": "Performance improved after cleanup.",
    },
]

MOCK_KNOWLEDGE_BASE = [
    {
        "id": "KB-001",
        "title": "Fix VPN authentication failures after password changes",
        "content": (
            "When a user changes their password, VPN authentication can fail if cached credentials "
            "or identity provider synchronization are stale. Ask the user to sign out, clear saved "
            "VPN credentials, synchronize the account, and recreate the VPN profile if needed."
        ),
        "category": "Network",
        "resolution_type": "Credential synchronization",
    },
    {
        "id": "KB-002",
        "title": "Resolve mailbox quota and delayed email delivery issues",
        "content": (
            "Mailbox delivery problems are often caused by storage quota limits, rules, or transport "
            "delays. Check mailbox size, archive old messages, validate mail rules, and verify mail "
            "flow after quota is restored."
        ),
        "category": "Email",
        "resolution_type": "Quota cleanup",
    },
    {
        "id": "KB-003",
        "title": "Troubleshoot slow workstation startup and high CPU usage",
        "content": (
            "Slow laptops can be caused by startup applications, outdated drivers, disk pressure, "
            "or background processes. Review startup programs, check CPU usage, update drivers, "
            "and run basic system diagnostics."
        ),
        "category": "Hardware",
        "resolution_type": "Device optimization",
    },
    {
        "id": "KB-004",
        "title": "Restore access to locked enterprise accounts",
        "content": (
            "For locked accounts, verify the user's identity, inspect failed login attempts, unlock "
            "the account, reset the password if required, and confirm successful access to core systems."
        ),
        "category": "Identity",
        "resolution_type": "Account unlock",
    },
    {
        "id": "KB-005",
        "title": "Investigate printer unavailable errors",
        "content": (
            "Printer unavailable errors can come from offline devices, stale print queues, driver "
            "issues, or network connectivity. Restart the print spooler, clear stuck jobs, verify "
            "the printer IP address, and reinstall the driver if necessary."
        ),
        "category": "Printing",
        "resolution_type": "Printer recovery",
    },
]
