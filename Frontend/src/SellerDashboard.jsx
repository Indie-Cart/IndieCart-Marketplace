import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth0 } from "@auth0/auth0-react";
import './SellerDashboard.css';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net';

function SellerDashboard() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth0();
  const navigate = useNavigate();
  const [sellerInfo, setSellerInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ordersToShip, setOrdersToShip] = useState([]);
  const [shippingOrderIds, setShippingOrderIds] = useState([]);
  const [shippingOrders, setShippingOrders] = useState([]);
  const [productsToShip, setProductsToShip] = useState([]);
  const [productsShipping, setProductsShipping] = useState([]);
  const [markingIds, setMarkingIds] = useState([]);
  const [productsShipped, setProductsShipped] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [salesTrends, setSalesTrends] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [customView, setCustomView] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');

  // Add a new tab for Reports
  const tabLabels = [
    'Products to Ship',
    'Being Shipped',
    'Shipped (Fulfilled)',
    'Reports',
  ];

  useEffect(() => {
    const fetchSellerData = async () => {
      // Don't proceed if Auth0 is still loading
      if (authLoading) {
        return;
      }

      if (!isAuthenticated || !user) {
        setError('Please log in to view seller dashboard');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/seller/check/${user.sub}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            setError('You are not registered as a seller');
            navigate('/apply-seller');
          } else {
            throw new Error(data.error || 'Failed to fetch seller data');
          }
          return;
        }

        setSellerInfo(data.sellerInfo);
        setProducts(data.products);

        // Fetch orders to ship
        const ordersRes = await fetch(`${API_URL}/api/seller/orders-to-ship/${user.sub}`);
        const ordersData = await ordersRes.json();
        setOrdersToShip(ordersData);
        // Fetch orders being shipped
        const shippingRes = await fetch(`${API_URL}/api/seller/orders-shipping/${user.sub}`);
        const shippingData = await shippingRes.json();
        setShippingOrders(shippingData);

        const toShipRes = await fetch(`${API_URL}/api/seller/products-to-ship/${user.sub}`);
        setProductsToShip(await toShipRes.json());
        const shippingRes2 = await fetch(`${API_URL}/api/seller/products-shipping/${user.sub}`);
        setProductsShipping(await shippingRes2.json());

        const shippedRes = await fetch(`${API_URL}/api/seller/products-shipped/${user.sub}`);
        setProductsShipped(await shippedRes.json());
      } catch (error) {
        console.error('Error fetching seller data:', error);
        setError('Failed to load seller dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [isAuthenticated, user, navigate, authLoading]);

  const handleMarkShipped = async (orderProductId) => {
    const confirmMsg =
      'You have 3-5 business days to ship your product to the customer. Please ensure prompt shipping and customer support. Would you like to Continue?';
    if (!window.confirm(confirmMsg)) return;
    setMarkingIds(prev => [...prev, orderProductId]);
    try {
      const res = await fetch(`${API_URL}/api/seller/mark-product-shipped/${orderProductId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setProductsToShip(prev => prev.filter(p => p.id !== orderProductId));
        const updated = await res.json();
        setProductsShipping(prev => [...prev, updated.orderProduct]);
      } else {
        alert('Failed to mark as shipped');
      }
    } finally {
      setMarkingIds(prev => prev.filter(id => id !== orderProductId));
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  // Fetch reports data when Reports tab is selected
  useEffect(() => {
    if (tabIndex !== 3 || !user) return;
    const fetchReports = async () => {
      setReportsLoading(true);
      setReportsError('');
      try {
        const [salesRes, invRes, customRes] = await Promise.all([
          fetch(`${API_URL}/api/seller/reports/sales-trends/${user.sub}`),
          fetch(`${API_URL}/api/seller/reports/inventory/${user.sub}`),
          fetch(`${API_URL}/api/seller/reports/custom/${user.sub}`),
        ]);
        setSalesTrends(await salesRes.json());
        setInventory(await invRes.json());
        setCustomView(await customRes.json());
      } catch (err) {
        setReportsError('Failed to load reports');
      } finally {
        setReportsLoading(false);
      }
    };
    fetchReports();
  }, [tabIndex, user]);

  // --- PDF Export Helpers ---
  const exportSalesTrendsPDF = () => {
    const doc = new jsPDF();
    doc.text('Sales Trends', 14, 16);
    autoTable(doc, {
      head: [['Order ID', 'Total Quantity', 'Total Revenue']],
      body: salesTrends.map(r => [r.order_id, r.total_quantity, r.total_revenue]),
      startY: 22,
    });
    doc.save('Sales_Trends.pdf');
  };
  const exportInventoryPDF = () => {
    const doc = new jsPDF();
    doc.text('Inventory Status', 14, 16);
    autoTable(doc, {
      head: [['Product ID', 'Title', 'Price', 'Stock']],
      body: inventory.map(r => [r.product_id, r.title, r.price, r.stock]),
      startY: 22,
    });
    doc.save('Inventory_Status.pdf');
  };
  const exportCustomViewPDF = () => {
    const doc = new jsPDF();
    doc.text('Custom View', 14, 16);
    autoTable(doc, {
      head: [['Order ID', 'Product', 'Quantity', 'Status', 'Price', 'Buyer', 'Address', 'Contact']],
      body: customView.map(r => [
        r.order_id,
        r.title,
        r.quantity,
        r.order_product_status,
        r.price,
        r.name,
        `${r.shipping_address}, ${r.suburb}, ${r.city}, ${r.province}, ${r.postal_code}`,
        r.number
      ]),
      startY: 22,
    });
    doc.save('Custom_View.pdf');
  };

  // Show loading state while Auth0 is checking authentication
  if (authLoading) {
    return <div className="seller-dashboard loading">Loading...</div>;
  }

  if (loading) {
    return <div className="seller-dashboard loading">Loading seller data...</div>;
  }

  if (error) {
    return <div className="seller-dashboard error">{error}</div>;
  }

  return (
    <main className="seller-dashboard">
      <div className="container">
        <div className="dashboard-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '5rem', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e0e0e0' }}>
          <div className="dashboard-header-left" style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ marginBottom: '0.5rem' }}>Seller Dashboard</h1>
            <div className="seller-info">
              <h2>{sellerInfo.shop_name}</h2>
              <p>Total Products: {sellerInfo.product_count}</p>
            </div>
          </div>
          <div className="dashboard-header-right" style={{ minWidth: 340, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Box sx={{ borderBottom: 0, width: '100%' }}>
              <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Order Tabs">
                {tabLabels.map((label, idx) => (
                  <Tab key={label} label={label} />
                ))}
              </Tabs>
            </Box>
          </div>
        </div>

        {tabIndex === 0 && (
          <section className="orders-to-ship">
            {productsToShip.length === 0 ? (
              <p>No products to ship.</p>
            ) : (
              productsToShip.map(product => (
                <div key={product.id} className="order-card">
                  <h3>Order #{product.order_id}</h3>
                  <div className="product-info" style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: 8 }}>
                    <span><strong>Product:</strong> {product.title}</span>
                    <span><strong>Quantity:</strong> {product.quantity}</span>
                  </div>
                  <div className="buyer-info">
                    <strong>Ship To:</strong><br />
                    {product.name}<br />
                    {product.shipping_address}<br />
                    {product.suburb}, {product.city}, {product.province}<br />
                    {product.postal_code}<br />
                    <strong>Contact:</strong> {product.number}
                  </div>
                  <button
                    className="mark-shipped-btn"
                    onClick={() => handleMarkShipped(product.id)}
                    disabled={markingIds.includes(product.id)}
                  >
                    {markingIds.includes(product.id) ? 'Marking...' : 'Mark as Shipped'}
                  </button>
                </div>
              ))
            )}
          </section>
        )}
        {tabIndex === 1 && (
          <section className="orders-to-ship">
            {productsShipping.length === 0 ? (
              <p>No products are currently being shipped.</p>
            ) : (
              productsShipping.map(product => (
                <div key={product.id} className="order-card">
                  <h3>Order #{product.order_id}</h3>
                  <div className="product-info" style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: 8 }}>
                    <span><strong>Product:</strong> {product.title}</span>
                    <span><strong>Quantity:</strong> {product.quantity}</span>
                  </div>
                  <div className="buyer-info">
                    <strong>Ship To:</strong><br />
                    {product.name}<br />
                    {product.shipping_address}<br />
                    {product.suburb}, {product.city}, {product.province}<br />
                    {product.postal_code}<br />
                    <strong>Contact:</strong> {product.number}
                  </div>
                  <span className="shipping-status">Shipping...</span>
                </div>
              ))
            )}
          </section>
        )}
        {tabIndex === 2 && (
          <section className="orders-to-ship">
            {productsShipped.length === 0 ? (
              <p>No products have been received and fulfilled yet.</p>
            ) : (
              productsShipped.map(product => (
                <div key={product.id} className="order-card">
                  <h3>Order #{product.order_id}</h3>
                  <div className="product-info" style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: 8 }}>
                    <span><strong>Product:</strong> {product.title}</span>
                    <span><strong>Quantity:</strong> {product.quantity}</span>
                  </div>
                  <div className="buyer-info">
                    <strong>Ship To:</strong><br />
                    {product.name}<br />
                    {product.shipping_address}<br />
                    {product.suburb}, {product.city}, {product.province}<br />
                    {product.postal_code}<br />
                    <strong>Contact:</strong> {product.number}
                  </div>
                  <span className="shipping-status">Shipped &amp; Fulfilled</span>
                </div>
              ))
            )}
          </section>
        )}
        {tabIndex === 3 && (
          <section className="reports-section" style={{ marginTop: '2rem' }}>
            {reportsLoading ? (
              <div>Loading reports...</div>
            ) : reportsError ? (
              <div style={{ color: 'red' }}>{reportsError}</div>
            ) : (
              <>
                {/* Sales Trends Report */}
                <div className="report-card" style={{ marginBottom: '2rem', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '2rem' }}>
                  <h2>Sales Trends</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={salesTrends} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="order_id" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total_revenue" fill="#1976d2" name="Revenue" />
                      <Bar dataKey="total_quantity" fill="#82ca9d" name="Quantity" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: '1rem' }}>
                    <Button variant="outlined" style={{ marginRight: 8 }} onClick={exportSalesTrendsPDF}>Export as PDF</Button>
                  </div>
                </div>
                {/* Inventory Status Report */}
                <div className="report-card" style={{ marginBottom: '2rem', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '2rem' }}>
                  <h2>Inventory Status</h2>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product ID</TableCell>
                          <TableCell>Title</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Stock</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {inventory.map(row => (
                          <TableRow key={row.product_id}>
                            <TableCell>{row.product_id}</TableCell>
                            <TableCell>{row.title}</TableCell>
                            <TableCell>{row.price}</TableCell>
                            <TableCell>{row.stock}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <div style={{ marginTop: '1rem' }}>
                    <Button variant="outlined" style={{ marginRight: 8 }} onClick={exportInventoryPDF}>Export as PDF</Button>
                  </div>
                </div>
                {/* Custom View Report */}
                <div className="report-card" style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '2rem' }}>
                  <h2>Custom View</h2>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Order ID</TableCell>
                          <TableCell>Product</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Buyer</TableCell>
                          <TableCell>Address</TableCell>
                          <TableCell>Contact</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customView.map(row => (
                          <TableRow key={row.id}>
                            <TableCell>{row.order_id}</TableCell>
                            <TableCell>{row.title}</TableCell>
                            <TableCell>{row.quantity}</TableCell>
                            <TableCell>{row.order_product_status}</TableCell>
                            <TableCell>{row.price}</TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>{`${row.shipping_address}, ${row.suburb}, ${row.city}, ${row.province}, ${row.postal_code}`}</TableCell>
                            <TableCell>{row.number}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <div style={{ marginTop: '1rem' }}>
                    <Button variant="outlined" style={{ marginRight: 8 }} onClick={exportCustomViewPDF}>Export as PDF</Button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        <section className="actions">
          <button onClick={() => navigate('/add-product')} className="add-product-btn">
            Add New Product
          </button>
        </section>
        <section className="product-grid">
          {products.length === 0 ? (
            <p className="no-products">You haven't added any products yet.</p>
          ) : (
            products.map(product => (
              <article key={product.product_id} className="product-card">
                <figure className="product-image">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title} />
                  ) : (
                    <div className="no-image">No Image Available</div>
                  )}
                  <figcaption className="product-overlay">
                    <Link to={`/edit-product/${product.product_id}`} className="view-details-btn">
                      Edit Product
                    </Link>
                  </figcaption>
                </figure>
                <section className="product-info">
                  <h3>{product.title}</h3>
                  <section className="product-meta">
                    <span className="price">R{product.price}</span>
                    <span className="stock">Stock: {product.stock}</span>
                  </section>
                </section>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

export default SellerDashboard; 