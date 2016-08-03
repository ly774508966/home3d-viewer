
#include <fstream>
#include <cassert>
#include <iostream>
#include <iomanip>
#include <string>
#include <vector>

#include <glm/glm.hpp>
#include <glm/gtc/type_ptr.hpp>

#ifdef _WIN32
#define sscanf sscanf_s
#endif


struct SegmentationRecord
{
	std::string			name;

	std::string			room;

	unsigned int		aat_id;
	std::string			aat_link;

	// oriented bounding box
	struct BBox
	{
		glm::vec3		position;
		glm::vec3		scale;
		// x,y and z scale
		glm::vec3		axis[3];
	}					bbox;
	
};


std::ostream& operator << (std::ostream& os, const SegmentationRecord& r)
{
	os << "{\n";
	os << "\"name\":\"" << r.name << "\",\n";
	os << "\"room\":\"" << r.room << "\",\n";
	os << "\"aat_id\": " << r.aat_id << ",\n"; // 000000000000, \n";
	os << "\"aat_link\": \"" << r.aat_link << "\",\n";
	os << "\"bbox_position\": [" << r.bbox.position.x << "," << r.bbox.position.y << "," << r.bbox.position.z << "],\n";
	os << "\"bbox_scale\": [" << r.bbox.scale.x << "," << r.bbox.scale.y << "," << r.bbox.scale.z << "],\n";
	os << "\"bbox_axis_x\": [" << r.bbox.axis[0].x << "," << r.bbox.axis[0].y << "," << r.bbox.axis[0].z << "],\n";
	os << "\"bbox_axis_y\": [" << r.bbox.axis[1].x << "," << r.bbox.axis[1].y << "," << r.bbox.axis[1].z << "],\n";
	os << "\"bbox_axis_z\": [" << r.bbox.axis[2].x << "," << r.bbox.axis[2].y << "," << r.bbox.axis[2].z << "]\n";

	os << "}";

	return os;
}


std::vector<std::string> tokenize(std::string input)
{
	using namespace std;
	vector<string> result;
	

	cout << "[Debug] \"" << input << "\": [";

	size_t n = input.find_first_of(" ");
	while (n != std::string::npos)
	{
		result.push_back(input.substr(0, n));
		input = input.substr(n + 1);
	}

	result.push_back(input);


	for (size_t i = 0; i < result.size()-1; ++i)
		cout << result[i] << ", ";
	cout << result.back() << "]\n";


	return move(result);
}


int main(int argc, const char** argv)
{
	using namespace std;

	if (argc == 1)
	{
		std::cerr << "Usage " << argv[0] << " <filename>\n";
		std::cerr << "Note: drag'n'drop works in windows.\n";
		return 2;
	}
		
	vector<SegmentationRecord> records;


	ifstream inFile(argv[1]);
	if (!inFile.is_open())
	{
		cerr << "[Error] Unable to open file \"" << argv[0] << "\"!\n";
		return -1;
	}
	
	while (!inFile.eof())
	{
		SegmentationRecord r;
		inFile >> r.name;
		

		size_t n = r.name.find_first_of("_");
		if (n == string::npos)
			continue;
		else
		{
			r.room = r.name.substr(0, n);
			r.name = r.name.substr(n + 1);
		}
		
		float junk[4] = { 0.f, 0.f, 0.f, 0.f };
		float trans[3] = { 0.f, 0.f, 0.f };
		
		glm::vec3 xAxis(0.f);
		inFile >> xAxis.x;
		inFile >> xAxis.y;
		inFile >> xAxis.z;
		float tmp;
		inFile >> tmp;

		glm::vec3 zAxis(0.f);
		inFile >> zAxis.x;
		inFile >> zAxis.y;
		inFile >> zAxis.z;
		inFile >> tmp;

		glm::vec3 yAxis(0.f);
		inFile >> yAxis.x;
		inFile >> yAxis.y;
		inFile >> yAxis.z;
		inFile >> tmp;

		inFile >> r.bbox.position.x;
		inFile >> r.bbox.position.z;
		inFile >> r.bbox.position.y; r.bbox.position.y *= -1;
		inFile >> tmp;

		r.bbox.scale = glm::vec3(glm::length(xAxis), glm::length(yAxis), glm::length(zAxis));
		
		glm::vec3 xA = glm::normalize(xAxis);
		glm::vec3 yA = glm::normalize(yAxis);
		glm::vec3 zA = glm::normalize(zAxis);
		
		r.bbox.axis[0] = glm::vec3(xA.x, yA.x, zA.x);
		r.bbox.axis[1] = glm::vec3(xA.y, yA.y, zA.y);
		r.bbox.axis[2] = glm::vec3(xA.z, yA.z, zA.z);

		r.aat_id = 0;
		r.aat_link = "UNDEFINED";


		records.push_back(r);
	
		cout << "[File] Read record \"" << r.name << "\"\n";
		
	}

	cout << "[File] Read " << records.size() << " records.\n";
	
	
	std::ofstream oFile(string(argv[1]) + ".out.json");
	oFile << "[";

	for (size_t i = 0; i < records.size() - 1; ++i)
		oFile << records[i] << ",";
	oFile << records.back();

	oFile << "]\n";




	system("pause");

	return 0;
}
