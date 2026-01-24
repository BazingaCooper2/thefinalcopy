export default function MapSection() {
  return (
    <div className="mt-6">
      <h2 className="font-semibold mb-2">Current Work Sessions</h2>
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d56558.50823894836!2d-80.323774!3d43.544805!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b88e2f47443d1%3A0x59abf69d6c9aeb4!2sGuelph%2C%20ON%2C%20Canada!5e0!3m2!1sen!2sin!4v1623670935719!5m2!1sen!2sin"
        width="100%"
        height="300"
        allowFullScreen=""
        loading="lazy"
        className="rounded border"
        title="Map"
      ></iframe>
    </div>
  );
}
