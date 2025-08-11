import './styledashboard.css';
import '../../node_modules/bootstrap/dist/css/bootstrap.min.css';
import '../../node_modules/bootstrap/dist/js/bootstrap.min.js';
export default function Navbar() {
  const date = new Date();
    const showTime = date.getHours() 
        + ':' + date.getMinutes() ;
  return (
    <div className='navbar sticky-top navbar-expand-lg bg-purple-200 text-centre vw-100 py-0 shadow'>
    <div className='container-fluid px-0'>
      <div className="justify-between navalign">
        <div className="navbar-brand text-white text-xl font-bold mx-3">Geri-Assist</div>
        <div className="navbar-nav me-auto mb-lg-0 mt-1">
          <input type="text" placeholder="Search" className="nav-item border rounded" />
        </div>
        <div className="right-element d-flex text-sm">
          <div className='row-md-12 ps-1'>Guelph Independent Living</div>
          <div className="text-xs text-gray">{showTime}</div>
        </div>
      </div>
      </div>
    </div>
  );
}
