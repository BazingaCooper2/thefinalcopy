import './styledashboard.css';
import axios from 'axios';
import SchedulePage from './SchedulePage copy';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import "../../node_modules/bootstrap-icons/font/bootstrap-icons.css";

export default function Sidebar() {
  return (
    <div>
    <div class="container-fluid overflow-hidden large-screen">
    <div className="bg-blue-900 text-white row vh-100 position-fixed">
      {/*<nav className="sidebar-nav">
        <li class="nav-item">
        <Link to="/" className='text-decoration-none text-white'>Dashboard</Link>
        </li>
        <li class="nav-item">
        Clients
        </li>
        <li class="nav-item">
        Employees
        </li>
        <li class="nav-item"><Link to="/schedule" className='text-decoration-none text-white'>
        Schedules</Link>
        </li>
      </nav>
      <div class="sidebar-footer border-top d-flex">
        <button class="sidebar-toggler" type="button"></button>
      </div>
    <div>  
    </div>*/}
    <div class="col-12 col-sm-3 col-xl-2 px-sm-2 px-0 bg-blue-900 d-flex sticky-top">
            <div class="d-flex flex-sm-column flex-row flex-grow-1 align-items-center align-items-sm-start px-3 pt-2 text-white">
                <ul class="nav nav-pills flex-sm-column flex-row flex-nowrap flex-shrink-1 flex-sm-grow-0 flex-grow-1 mb-sm-auto mb-0 justify-content-center align-items-center align-items-sm-start text-white" id="menu">
                    <li class="nav-item">
                        <a href="/"><Link to="/" class="nav-link px-sm-0 px-2">
                            <i class="fs-5 bi-speedometer2"></i><span class="ms-1 d-none d-sm-inline text-white">Dashboard</span>
                        </Link></a>
                    </li>
                    <li>
                        <a href="#submenu1" class="nav-link px-sm-0 px-2">
                            <i class="fs-5 bi-person"></i><span class="ms-1 d-none d-sm-inline text-white"><Link to="/client" className='text-decoration-none text-white'>Client</Link></span> </a>
                    </li>
                    <li>
                        <a href="#" class="nav-link px-sm-0 px-2">
                            <i class="fs-5 bi-bag-plus"></i><span class="ms-1 d-none d-sm-inline text-white"><Link to="/employee" className='text-decoration-none text-white'>Employee</Link></span></a>
                    </li>
                    <li class="dropdown text-white">
                        <a href="#" class="nav-link dropdown-toggle px-sm-0 px-1" id="dropdown" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fs-5 bi-table"></i><span class="ms-1 d-none d-sm-inline">Schedule</span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-dark text-small shadow" aria-labelledby="dropdown">
                            <li><a class="dropdown-item" href="#">Daily Schedule</a></li>
                            <li><a class="dropdown-item" href="#">ClientSchedule</a></li>
                            <li><a class="dropdown-item" href="#">Employee Schedule</a></li>
                            <li><a class="dropdown-item" href="#"><Link to="/schedule" className='text-decoration-none text-white'>All Schedule</Link></a></li>
                            <li><a class="dropdown-item" href="#"><Link to="/monthlySchedule" className='text-decoration-none text-white'>Prepare Monthly Schedule</Link></a></li>
                        </ul>
                    </li>
                    <li class="dropdown text-white">
                        <a href="#" class="nav-link dropdown-toggle px-sm-0 px-1" id="dropdown" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-bandaid-fill"></i><span class="ms-1 d-none d-sm-inline">Injury Reports</span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-dark text-small shadow" aria-labelledby="dropdown">
                            <li><a class="dropdown-item" href="#"><Link to="/injuryReport" className='text-decoration-none text-white'>Client Injury Report</Link></a></li>
                            <li><a class="dropdown-item" href="#"><Link to="/injuryReport" className='text-decoration-none text-white'>Employee Injury Report</Link></a></li>
                            <li><a class="dropdown-item" href="#"><Link to="/fillInjuryReport" className='text-decoration-none text-white'>Fill Injury Report</Link></a></li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
    </div>
    </div>
    <div class="container-fluid overflow-hidden small-screen">
    <div class="row vw-100 overflow-auto">
        <div class="col-12 col-sm-3 col-xl-2 px-sm-2 px-0 backpurple-200 d-flex">
            <div class="d-flex flex-sm-column flex-row flex-grow-1 align-items-center align-items-sm-start px-3 pt-2 text-white">
                <ul class="nav nav-pills flex-sm-column flex-row flex-nowrap flex-shrink-1 flex-sm-grow-0 flex-grow-1 mb-sm-auto mb-0 justify-content-center align-items-center align-items-sm-start" id="menu">
                    <li class="nav-item">
                        <Link to="/" class="nav-link px-sm-0 px-2">
                            <i class="fs-5 bi-speedometer2 text-white"></i>
                        </Link>
                    </li>
                    <li>
                        <a href="#submenu1" class="nav-link px-sm-0 px-2">
                            <i class="fs-5 bi-person text-white"></i></a>
                    </li>
                    <li>
                        <a href="#" class="nav-link px-sm-0 px-2">
                            <i class="fs-5 bi-bag-plus text-white"></i></a>
                    </li>
                    <li>
                           <Link to="/schedule" class="nav-link px-sm-0 px-2">
                           <i class="fs-5 bi-table text-white"></i></Link> 
                    </li>
                    <li>
                           <Link to="/schedule" class="nav-link px-sm-0 px-2">
                           <i class="bi bi-bandaid-fill text-white"></i></Link> 
                    </li>
                </ul>
            </div>
        </div>
      </div>
    </div>
    </div>
  );
}


