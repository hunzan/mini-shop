import { useNavigate } from "react-router-dom";
import rabbitImg from "../assets/rabbit.jpg";

export default function Home() {
  const navigate = useNavigate();

  return (
    <section className="home-hero">
      <img className="home-hero__img" src={rabbitImg} alt="思融的拼豆作品展示" />

      <div className="home-hero__content">
        <h1>歡迎光臨思融的精品店</h1>
        <hr style={{ margin: "1.5rem 0" }} />
        <p>店裡有很多我創造的拼豆作品</p>
        <p>請慢慢參觀選購</p>

        <button className="btn" onClick={() => navigate("/products")}>
          開始逛逛
        </button>
      </div>
    </section>
  );
}
