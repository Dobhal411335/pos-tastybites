export const employeeCredentialsTemplate = ({
  employeeName,
  employeeId,
  username,
  password,
  role,
  restaurantName,
  floor,
  device,
  loginUrl,
  companyInfo
}) => {
  const currentYear = new Date().getFullYear();

  // Extract Company Basic Info
  const logo = companyInfo?.mainLogo?.url || null;
  const footerLogo = companyInfo?.footerLogo?.url || logo;
  const brandName = companyInfo?.companyName || restaurantName || 'Our Restaurant';
  const emailContact = companyInfo?.emails?.[0] || '';
  const phoneContact = companyInfo?.contactNumbers?.[0] || '';
  const address = companyInfo?.officeAddresses?.[0] || '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Employee Credentials</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Inter', Helvetica, Arial, sans-serif;
          background: #FAF8F4;
          color: #18181B;
        }
        .container {
          max-width: 620px;
          margin: 30px auto;
          background: #ffffff;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid #E7E5E4;
          box-shadow: 0 8px 30px rgba(0,0,0,.05);
        }
        .header {
          background: linear-gradient(180deg, #FFF8F2 0%, #FFFFFF 100%);
          border-bottom: 1px solid #FED7AA;
          padding: 40px;
          text-align: center;
        }
        .logo {
          max-height: 52px;
          margin-bottom: 16px;
        }
        .header-title {
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #F97316;
          margin: 0;
          font-weight: 700;
        }
        .content {
          padding: 40px 32px;
        }
        .heading {
          font-size: 26px;
          font-weight: 800;
          color: #111111;
          margin: 0 0 16px 0;
          text-align: center;
        }
        .greeting {
          font-size: 16px;
          line-height: 26px;
          color: #444444;
          margin: 0 0 32px 0;
          text-align: center;
        }
        .card {
          background-color: #FAFAFA;
          border-radius: 14px;
          padding: 28px;
          margin-bottom: 24px;
          border: 1px solid #E5E7EB;
        }
        .card-title {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: #6B7280;
          margin: 0 0 20px 0;
          font-weight: 700;
          border-bottom: 1px solid #E5E7EB;
          padding-bottom: 12px;
        }
        .info-grid {
          display: table;
          width: 100%;
        }
        .info-row {
          display: table-row;
        }
        .info-label {
          display: table-cell;
          padding: 10px 16px 10px 0;
          font-size: 14px;
          color: #6b7280;
          font-weight: 600;
          width: 40%;
        }
        .info-value {
          display: table-cell;
          padding: 10px 0;
          font-size: 15px;
          color: #18181B;
          font-weight: 700;
        }
        .credentials-card {
          background-color: #FFF7ED;
          border: 1px solid #FDBA74;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          text-align: center;
        }
        .cred-label {
          font-size: 14px;
          font-weight: 700;
          color: #C2410C;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .cred-value {
          font-family: 'Courier New', Courier, monospace;
          font-size: 20px;
          font-weight: 800;
          color: #9A3412;
          background-color: #FFEDD5;
          padding: 10px 16px;
          border-radius: 8px;
          margin: 0 auto 20px auto;
          letter-spacing: 2px;
          display: inline-block;
          border: 1px dashed #FDBA74;
        }
        .btn-container {
          text-align: center;
          margin-bottom: 32px;
        }
        .btn {
          display: inline-block;
          background-color: #F97316;
          color: #ffffff;
          font-weight: 700;
          font-size: 16px;
          text-decoration: none;
          padding: 18px 40px;
          border-radius: 50px;
          box-shadow: 0 4px 14px rgba(249, 115, 22, 0.3);
          transition: transform 0.2s ease;
        }
        .notice {
          background-color: #FAFAFA;
          border-left: 4px solid #F97316;
          padding: 20px 24px;
          border-radius: 8px;
          margin-bottom: 40px;
          border-top: 1px solid #E5E7EB;
          border-right: 1px solid #E5E7EB;
          border-bottom: 1px solid #E5E7EB;
        }
        .notice-title {
          font-size: 15px;
          font-weight: 800;
          color: #111111;
          margin: 0 0 12px 0;
        }
        .notice ul {
          margin: 0;
          padding-left: 20px;
        }
        .notice li {
          font-size: 14px;
          color: #4B5563;
          line-height: 24px;
          margin-bottom: 8px;
        }
        .footer {
          background-color: #FAFAFA;
          padding: 40px 32px;
          text-align: center;
          border-top: 1px solid #E7E5E4;
        }
        .footer-logo {
          max-height: 36px;
          margin-bottom: 20px;
          opacity: 0.8;
        }
        .footer-text {
          font-size: 13px;
          color: #6B7280;
          margin: 0 0 6px 0;
          line-height: 20px;
        }
        .footer-contact {
          font-size: 13px;
          color: #4B5563;
          margin-top: 16px;
          font-weight: 500;
        }
        .footer-contact a {
          color: #F97316;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div style="padding: 20px;">
        <div class="container">
          <!-- Header -->
          <div class="header">
            ${logo ? `<img src="${logo}" alt="${brandName}" class="logo">` : `<h2 style="margin: 0 0 12px 0; color: #111; font-size: 28px;">${brandName}</h2>`}
            <p class="header-title">Employee Portal Access</p>
          </div>

          <!-- Content -->
          <div class="content">
            <h1 class="heading">Welcome to the Team, ${employeeName.split(' ')[0]}!</h1>
            
            <p class="greeting">
              Your official employee account has been successfully approved.<br>Please use the secure credentials below to access the Point of Sale system.
            </p>

            <!-- Info Card -->
            <div class="card">
              <h3 class="card-title">Account Details</h3>
              <div class="info-grid">
                <div class="info-row">
                  <div class="info-label">Full Name</div>
                  <div class="info-value">${employeeName}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Employee ID</div>
                  <div class="info-value">${employeeId || 'N/A'}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Assigned Role</div>
                  <div class="info-value">${role}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Primary Location</div>
                  <div class="info-value">${restaurantName}</div>
                </div>
                ${floor ? `
                <div class="info-row">
                  <div class="info-label">Assigned Floor</div>
                  <div class="info-value">${floor}</div>
                </div>
                ` : ''}
                ${device ? `
                <div class="info-row">
                  <div class="info-label">Device</div>
                  <div class="info-value">${device}</div>
                </div>
                ` : ''}
              </div>
            </div>

            <!-- Credentials Card -->
            <div class="credentials-card">
              <h3 class="card-title" style="border-bottom: none; color: #EA580C; margin-bottom: 24px;">Your Secure Login</h3>
              
              <p class="cred-label">Employee ID</p>
              <div class="cred-value">${employeeId}</div>
              
              <p class="cred-label">Password</p>
              <div class="cred-value">${password}</div>
              
              <p class="cred-label">Login Portal URL</p>
              <p style="font-size: 15px; font-weight: 700; margin: 8px 0 0 0;">
                <a href="https://pos.tastybitesrestaurant.com/login" style="color: #EA580C; text-decoration: underline;">https://pos.tastybitesrestaurant.com/login</a>
              </p>
            </div>

            <!-- CTA -->
            <div class="btn-container">
              <a href="https://pos.tastybitesrestaurant.com/login" class="btn" style="color: #ffffff; text-decoration: none;">Log In To Employee Portal</a>
            </div>

            <!-- Notice -->
            <div class="notice">
              <p class="notice-title">Security Notice</p>
              <ul>
                <li>These credentials grant you access to internal restaurant operations.</li>
                <li><strong>Never share your password</strong> with colleagues or customers.</li>
                <li>If you suspect your account is compromised, notify your manager immediately.</li>
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            ${footerLogo ? `<img src="${footerLogo}" alt="${brandName}" class="footer-logo">` : ''}
            
            ${address ? `<p class="footer-text">${address}</p>` : ''}
            
            <p class="footer-text">${brandName} &copy; ${currentYear} All Rights Reserved</p>
            
            ${(emailContact || phoneContact) ? `
            <div class="footer-contact">
              Need assistance? 
              ${emailContact ? `<a href="mailto:${emailContact}">${emailContact}</a>` : ''}
              ${(emailContact && phoneContact) ? ' | ' : ''}
              ${phoneContact ? `${phoneContact}` : ''}
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
