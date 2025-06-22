# Server Status

## 🟢 All Systems Operational

### Backend API
- **Status**: ✅ Running
- **URL**: http://localhost:5001
- **Health Check**: http://localhost:5001/health
- **Process ID**: 98869

### Frontend Application
- **Status**: ✅ Running
- **URL**: http://localhost:3001
- **Process ID**: 99536
- **Note**: Running on port 3001 (3000 was in use)

## Access the Application

1. Open your browser and go to: **http://localhost:3001**
2. You should see the Praxis landing page
3. Click "Get Started" to access the login page

## Demo Credentials

To use the demo account, first seed the database:

```bash
cd backend
npm run seed:demo
```

Then login with:
- **Email**: demo@praxis.edu
- **Password**: demo123456

## Stop the Servers

To stop the servers when you're done:

```bash
# Stop backend
kill 98869

# Stop frontend
kill 99536
```

Or use:
```bash
pkill -f "node.*simple-server"
pkill -f "next dev"
```

## Troubleshooting

If you encounter any issues:

1. **Port conflicts**: The frontend automatically moved to port 3001 because 3000 was in use
2. **Database connection**: Ensure your Supabase credentials are correctly set in backend/.env
3. **Module errors**: Run `npm install` in both backend and frontend directories

## Quick Health Check

```bash
# Check backend
curl http://localhost:5001/health

# Check frontend
curl -I http://localhost:3001
```