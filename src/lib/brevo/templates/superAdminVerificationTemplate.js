export const superAdminVerificationTemplate = ({
  superAdminName,
  adminName,
  adminEmail,
  adminRole,
  verificationCode,
  adminDashboardUrl,
  companyInfo
}) => {
  const currentYear = new Date().getFullYear();
  const logo = companyInfo?.mainLogo?.url || null;
  const brandName = companyInfo?.companyName || 'Restaurant Management';
  const emailContact = companyInfo?.emails?.[0] || '';
  const phoneContact = companyInfo?.contactNumbers?.[0] || '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Verification</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: Inter, Helvetica, Arial, sans-serif;
          background: #fffaf4;
          color: #111827;
        }
        .wrapper {
          padding: 28px 16px;
        }
        .card {
          max-width: 640px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #f1e4d1;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        }
        .header {
          padding: 36px 32px 28px;
          text-align: center;
          background: linear-gradient(180deg, #fff6ec 0%, #ffffff 100%);
          border-bottom: 1px solid #f3dcc0;
        }
        .logo {
          max-height: 54px;
          margin-bottom: 14px;
        }
        .eyebrow {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1.8px;
          font-size: 12px;
          color: #ea580c;
          font-weight: 800;
        }
        .title {
          margin: 12px 0 0;
          font-size: 28px;
          line-height: 1.15;
          font-weight: 900;
          color: #111827;
        }
        .content {
          padding: 32px;
        }
        .intro {
          margin: 0 0 22px;
          font-size: 16px;
          line-height: 26px;
          color: #4b5563;
        }
        .codeBox {
          background: #fff7ed;
          border: 1px dashed #fb923c;
          border-radius: 16px;
          padding: 22px 20px;
          text-align: center;
          margin-bottom: 22px;
        }
        .codeLabel {
          margin: 0 0 10px;
          color: #c2410c;
          text-transform: uppercase;
          letter-spacing: 1.4px;
          font-size: 12px;
          font-weight: 800;
        }
        .codeValue {
          display: inline-block;
          background: #ffffff;
          border-radius: 12px;
          padding: 14px 22px;
          font-size: 30px;
          letter-spacing: 6px;
          font-weight: 900;
          color: #9a3412;
          border: 1px solid #fdba74;
          font-family: 'Courier New', Courier, monospace;
        }
        .grid {
          display: table;
          width: 100%;
          margin-top: 20px;
          border-collapse: collapse;
        }
        .row {
          display: table-row;
        }
        .label,
        .value {
          display: table-cell;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: top;
          font-size: 14px;
        }
        .label {
          width: 38%;
          color: #6b7280;
          font-weight: 700;
        }
        .value {
          color: #111827;
          font-weight: 700;
        }
        .buttonWrap {
          text-align: center;
          margin: 28px 0 12px;
        }
        .button {
          display: inline-block;
          background: #f97316;
          color: #ffffff !important;
          text-decoration: none;
          font-weight: 800;
          padding: 15px 28px;
          border-radius: 999px;
          box-shadow: 0 10px 20px rgba(249, 115, 22, 0.22);
        }
        .note {
          background: #fafafa;
          border-left: 4px solid #f97316;
          padding: 18px 18px 18px 20px;
          border-radius: 12px;
          color: #4b5563;
          font-size: 14px;
          line-height: 22px;
        }
        .footer {
          padding: 22px 32px 30px;
          background: #fafafa;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footerBrand {
          margin: 0 0 8px;
          font-weight: 800;
          color: #111827;
        }
        .footerText {
          margin: 0;
          color: #6b7280;
          font-size: 12px;
          line-height: 20px;
        }
        .footerText a {
          color: #ea580c;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="header">
            ${logo ? `<img src="${logo}" alt="${brandName}" class="logo">` : ''}
            <p class="eyebrow">Admin Verification Required</p>
            <h1 class="title">Review the new admin account</h1>
          </div>

          <div class="content">
            <p class="intro">
              Hello ${superAdminName || 'Super Admin'}, a new admin account has been created and needs your verification before it can be used.
            </p>

            <div class="codeBox">
              <p class="codeLabel">Verification Code</p>
              <div class="codeValue">${verificationCode}</div>
            </div>

            <div class="grid">
              <div class="row">
                <div class="label">Admin Name</div>
                <div class="value">${adminName}</div>
              </div>
              <div class="row">
                <div class="label">Admin Email</div>
                <div class="value">${adminEmail}</div>
              </div>
              <div class="row">
                <div class="label">Requested Role</div>
                <div class="value">${adminRole}</div>
              </div>
              <div class="row">
                <div class="label">Verification Status</div>
                <div class="value">Pending Approval</div>
              </div>
            </div>

            <div class="buttonWrap">
              ${adminDashboardUrl ? `<a href="${adminDashboardUrl}" class="button">Open Admin Users</a>` : ''}
            </div>

            <div class="note">
              Enter the code in the Admin Users verification dialog to approve this account. The code expires shortly after creation, so complete the review promptly.
            </div>
          </div>

          <div class="footer">
            <p class="footerBrand">${brandName}</p>
            <p class="footerText">
              ${emailContact ? `${emailContact}` : ''}
              ${phoneContact ? `${emailContact ? ' • ' : ''}${phoneContact}` : ''}
            </p>
            <p class="footerText">© ${currentYear} ${brandName}. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};