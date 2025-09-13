# 🔧 Render Environment Variables Setup

## Required Environment Variables

### **Backend Service Environment Variables:**

#### **1. JWT_SECRET (Required)**
```bash
# Generate a secure random string
# You can use: https://generate-secret.vercel.app/32
JWT_SECRET=your-very-secure-jwt-secret-key-here
```

#### **2. Google OAuth (Required for Google Login)**
```bash
# Get these from Google Cloud Console
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

#### **3. Frontend URL (Auto-configured)**
```bash
FRONTEND_URL=https://campusconnect-frontend.onrender.com
```

### **Frontend Service Environment Variables:**

#### **1. API URL (Auto-configured)**
```bash
REACT_APP_API_URL=https://campusconnect-backend.onrender.com
```

#### **2. Google OAuth Client ID**
```bash
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id-here
```

## 🔑 How to Set Environment Variables in Render:

### **Step 1: Go to Your Service**
1. Open [render.com](https://render.com)
2. Go to your dashboard
3. Click on your service (frontend or backend)

### **Step 2: Add Environment Variables**
1. Click on "Environment" tab
2. Click "Add Environment Variable"
3. Enter the key and value
4. Click "Save Changes"

### **Step 3: Redeploy**
1. Go to "Manual Deploy" tab
2. Click "Deploy latest commit"
3. Wait for deployment to complete

## 🎯 **Quick Setup Checklist:**

### **Backend Service:**
- [ ] `JWT_SECRET` - Generate secure random string
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- [ ] `FRONTEND_URL` - Auto-set to your frontend URL

### **Frontend Service:**
- [ ] `REACT_APP_API_URL` - Auto-set to your backend URL
- [ ] `REACT_APP_GOOGLE_CLIENT_ID` - Same as backend

## 🔐 **Security Tips:**

### **JWT_SECRET:**
- Use at least 32 characters
- Mix letters, numbers, and symbols
- Don't use common words or phrases
- Example: `Kj8#mN2$pL9@qR5&vX7*wE3!tY6^uI1`

### **Google OAuth:**
- Keep client secret secure
- Use different credentials for development/production
- Regularly rotate secrets

## 🆘 **Troubleshooting:**

### **Common Issues:**
1. **Google OAuth not working**: Check client ID and secret
2. **JWT errors**: Verify JWT_SECRET is set correctly
3. **API connection failed**: Check REACT_APP_API_URL

### **Testing Your Setup:**
1. **Frontend**: Visit your frontend URL
2. **Backend**: Visit `https://your-backend-url.onrender.com/api/health`
3. **Google Login**: Try logging in with Google

## 📞 **Need Help?**
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Google OAuth Setup**: [developers.google.com/identity](https://developers.google.com/identity)
